"""
Admin endpoints:
GET /admin/artisans                  -> Manage/list artisans (with pending filter)
PUT /admin/artisans/{id}/verify      -> Verify (or reject) artisan

Dashboard:
GET /admin/stats                     -> نظرة عامة (حرفيين/طلبات/زباين/تقييمات)
GET /admin/services/stats            -> تراكنك لكل خدمة صيانة + سبب لو الأداء تحت المتوسط
GET /admin/reviews                   -> كل تقييمات السكان (خانة الـ Reviews بالداشبورد)
PUT /admin/requests/{id}/assign      -> ربط طلب بدون حرفي بحرفي معتمد
GET /admin/complaints                -> شكاوى السكان (?status_filter=)
PUT /admin/complaints/{id}           -> تغيير حالة الشكوى + رد (يوصل إشعار للساكن)
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Artisan, Complaint, ComplaintStatus, NotificationType, Review, Service,
    ServiceRequest, RequestStatus, User, UserRole,
)
from app.notifications import notify
from app.schemas import (
    ArtisanRead,
    ArtisanCountStats,
    RequestCountStats,
    AdminOverviewStats,
    ServiceStat,
    ReviewDetailed,
    RequestWithProgress,
    ArtisanActivityStat,
    ComplaintRead,
    ComplaintAdminUpdate,
)
from app.auth import require_role
from app.progress import build_progress

router = APIRouter(prefix="/admin", tags=["Admin"])

# نسبة رفض أعلى من هذا الحد تُعتبر مؤشر سلبي بحد ذاتها
REJECTION_RATE_FLAG = 0.3


@router.get("/artisans", response_model=List[ArtisanRead])
def list_all_artisans(
    verified: Optional[bool] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    query = select(Artisan)
    if verified is not None:
        query = query.where(Artisan.verified == verified)

    artisans = session.exec(query).all()
    results = []
    for a in artisans:
        user = session.get(User, a.user_id)
        data = ArtisanRead.model_validate(a)
        data.name = user.name if user else None
        results.append(data)
    return results


@router.put("/artisans/{artisan_id}/verify", response_model=ArtisanRead)
def verify_artisan(
    artisan_id: int,
    approve: bool = True,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    artisan = session.get(Artisan, artisan_id)
    if not artisan:
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")

    artisan.verified = approve
    session.add(artisan)
    session.commit()
    session.refresh(artisan)

    user = session.get(User, artisan.user_id)
    data = ArtisanRead.model_validate(artisan)
    data.name = user.name if user else None
    return data


# ---------- Dashboard: نظرة عامة ----------

@router.get("/stats", response_model=AdminOverviewStats)
def get_overview_stats(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    all_artisans = session.exec(select(Artisan)).all()
    verified_count = sum(1 for a in all_artisans if a.verified)

    all_requests = session.exec(select(ServiceRequest)).all()
    by_status = {s: 0 for s in RequestStatus}
    for r in all_requests:
        by_status[r.status] += 1

    customers_count = len(
        session.exec(select(User).where(User.role == UserRole.customer)).all()
    )

    all_reviews = session.exec(select(Review)).all()
    overall_avg = (
        round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
        if all_reviews
        else None
    )

    return AdminOverviewStats(
        artisans=ArtisanCountStats(
            total=len(all_artisans),
            verified=verified_count,
            pending=len(all_artisans) - verified_count,
        ),
        requests=RequestCountStats(
            pending=by_status[RequestStatus.pending],
            accepted=by_status[RequestStatus.accepted],
            rejected=by_status[RequestStatus.rejected],
            in_progress=by_status[RequestStatus.in_progress],
            completed=by_status[RequestStatus.completed],
            total=len(all_requests),
        ),
        customers_count=customers_count,
        overall_average_rating=overall_avg,
        total_reviews=len(all_reviews),
    )


# ---------- Dashboard: تراكنك لكل خدمة صيانة ----------

@router.get("/services/stats", response_model=List[ServiceStat])
def get_service_stats(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    services = session.exec(select(Service)).all()
    all_reviews = session.exec(select(Review)).all()
    overall_avg = (
        round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
        if all_reviews
        else None
    )

    results: List[ServiceStat] = []
    for service in services:
        requests = session.exec(
            select(ServiceRequest).where(ServiceRequest.service_id == service.id)
        ).all()
        request_ids = [r.id for r in requests]

        reviews = [r for r in all_reviews if r.request_id in request_ids]
        service_avg = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else None

        completed = sum(1 for r in requests if r.status == RequestStatus.completed)
        rejected = sum(1 for r in requests if r.status == RequestStatus.rejected)
        total = len(requests)

        reasons = []
        if service_avg is not None and overall_avg is not None and service_avg < overall_avg:
            reasons.append(f"متوسط التقييم ({service_avg}) أقل من المعدل العام ({overall_avg})")
        if total > 0 and (rejected / total) > REJECTION_RATE_FLAG:
            pct = round((rejected / total) * 100)
            reasons.append(f"نسبة رفض الطلبات مرتفعة ({pct}%)")

        results.append(
            ServiceStat(
                service_id=service.id,
                service_name=service.name,
                total_requests=total,
                completed_requests=completed,
                rejected_requests=rejected,
                reviews_count=len(reviews),
                average_rating=service_avg,
                below_average=bool(reasons),
                reason="؛ ".join(reasons) if reasons else None,
            )
        )

    return results


# ---------- Dashboard: خانة تقييمات السكان ----------

@router.get("/reviews", response_model=List[ReviewDetailed])
def get_all_reviews(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    reviews = session.exec(select(Review).order_by(Review.created_at.desc())).all()

    results: List[ReviewDetailed] = []
    for rv in reviews:
        customer = session.get(User, rv.customer_id)
        artisan = session.get(Artisan, rv.artisan_id)
        artisan_user = session.get(User, artisan.user_id) if artisan else None
        req = session.get(ServiceRequest, rv.request_id)
        service = session.get(Service, req.service_id) if req else None

        results.append(
            ReviewDetailed(
                id=rv.id,
                rating=rv.rating,
                comment=rv.comment,
                created_at=rv.created_at,
                customer_name=customer.name if customer else None,
                artisan_name=artisan_user.name if artisan_user else None,
                service_name=service.name if service else None,
            )
        )

    return results


# ---------- Dashboard: مراقبة كل عملية بشريط تقدّم دقيق ----------

@router.get("/requests", response_model=List[RequestWithProgress])
def get_all_requests_with_progress(
    status_filter: Optional[RequestStatus] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    query = select(ServiceRequest)
    if status_filter is not None:
        query = query.where(ServiceRequest.status == status_filter)

    requests = session.exec(query.order_by(ServiceRequest.created_at.desc())).all()

    results: List[RequestWithProgress] = []
    for req in requests:
        customer = session.get(User, req.customer_id)
        artisan = session.get(Artisan, req.artisan_id) if req.artisan_id else None
        artisan_user = session.get(User, artisan.user_id) if artisan else None
        service = session.get(Service, req.service_id)

        results.append(
            RequestWithProgress(
                id=req.id,
                customer_name=customer.name if customer else None,
                artisan_name=artisan_user.name if artisan_user else None,
                service_name=service.name if service else None,
                location=req.location,
                status=req.status,
                created_at=req.created_at,
                progress=[s.model_dump() for s in build_progress(req.status)],
            )
        )

    return results


# ---------- Dashboard: نشاط كل حرفي (Bar Chart: يوم / شهر / سنة) ----------

@router.get("/artisans/activity", response_model=List[ArtisanActivityStat])
def get_artisans_activity(
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)

    artisans = session.exec(select(Artisan)).all()
    all_requests = session.exec(select(ServiceRequest)).all()

    results: List[ArtisanActivityStat] = []
    for a in artisans:
        user = session.get(User, a.user_id)
        artisan_requests = [r for r in all_requests if r.artisan_id == a.id]

        results.append(
            ArtisanActivityStat(
                artisan_id=a.id,
                artisan_name=user.name if user else None,
                specialty=a.specialty,
                today=sum(1 for r in artisan_requests if r.created_at >= today_start),
                this_month=sum(1 for r in artisan_requests if r.created_at >= month_start),
                this_year=sum(1 for r in artisan_requests if r.created_at >= year_start),
            )
        )

    return results


# ---------- ربط طلب ما عنده حرفي بحرفي (لما التعيين التلقائي ما يلگى أحد) ----------

@router.put("/requests/{request_id}/assign")
def assign_request_to_artisan(
    request_id: int,
    artisan_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="نكدر نعيّن حرفي بس للطلبات المعلقة")

    artisan = session.get(Artisan, artisan_id)
    if not artisan or not artisan.verified:
        raise HTTPException(status_code=404, detail="الحرفي غير موجود أو غير معتمد")

    req.artisan_id = artisan.id
    session.add(req)
    artisan_user = session.get(User, artisan.user_id)
    notify(session, req.customer_id, NotificationType.request_assigned,
           f"تم تعيين حرفي لطلبك رقم #{req.id}",
           f"الحرفي {artisan_user.name if artisan_user else ''} — بانتظار القبول", req.id)
    notify(session, artisan.user_id, NotificationType.new_request,
           f"وصلك طلب جديد رقم #{req.id}", req.location, req.id)
    session.commit()
    return {"id": req.id, "artisan_id": req.artisan_id, "status": req.status}


# ---------- الشكاوى من السكان ----------

@router.get("/complaints", response_model=List[ComplaintRead])
def list_complaints(
    status_filter: Optional[ComplaintStatus] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    query = select(Complaint)
    if status_filter is not None:
        query = query.where(Complaint.status == status_filter)
    complaints = session.exec(query.order_by(Complaint.created_at.desc())).all()
    results = []
    for c in complaints:
        u = session.get(User, c.customer_id)
        data = ComplaintRead.model_validate(c, from_attributes=True)
        data.customer_name = u.name if u else None
        results.append(data)
    return results


@router.put("/complaints/{complaint_id}", response_model=ComplaintRead)
def update_complaint(
    complaint_id: int,
    payload: ComplaintAdminUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.admin)),
):
    c = session.get(Complaint, complaint_id)
    if not c:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")

    if payload.status is not None:
        try:
            c.status = ComplaintStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="حالة غير معروفة")
    if payload.admin_reply is not None:
        c.admin_reply = payload.admin_reply
    c.updated_at = datetime.utcnow()
    session.add(c)

    status_ar = {"open": "مفتوحة", "in_review": "قيد المتابعة", "resolved": "تم الحل"}[c.status.value]
    notify(session, c.customer_id, NotificationType.complaint_update,
           f"تحديث على شكواك #{c.id}: {status_ar}", c.admin_reply, c.request_id)
    session.commit()
    session.refresh(c)

    u = session.get(User, c.customer_id)
    data = ComplaintRead.model_validate(c, from_attributes=True)
    data.customer_name = u.name if u else None
    return data
