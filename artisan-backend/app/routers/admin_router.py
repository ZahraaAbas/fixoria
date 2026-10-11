"""
Admin endpoints (مشرف المجمع — كل شي محدد بمجمعه، app/tenancy.py):
GET /admin/artisans                  -> حرفيو الشركات المتفقة ويه المجمع (للاطلاع؛ الشركة تديرهم)

سكان المجمع:
GET /admin/residents                 -> سكان المجمع وحالة عضويتهم (?status_filter=pending)
PUT /admin/residents/{user_id}/membership -> قبول/رفض ساكن (يوصله إشعار)

Dashboard:
GET /admin/stats                     -> نظرة عامة (حرفيين/طلبات/زباين/تقييمات)
GET /admin/services/stats            -> تراكنك لكل خدمة صيانة + سبب لو الأداء تحت المتوسط
GET /admin/reviews                   -> كل تقييمات السكان (خانة الـ Reviews بالداشبورد)
PUT /admin/requests/{id}/review/visibility -> إخفاء/إظهار تقييم الطلب
GET /admin/requests                  -> كل الطلبات بكامل تفاصيلها (?status_filter=)
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
    Artisan, Complaint, ComplaintStatus, MembershipStatus, NotificationType, ResidentProfile, Review,
    Service, ServiceRequest, RequestStatus, User, UserRole,
)
from app.notifications import notify
from app.payments import summarize
from app.schemas import (
    PaymentsSummary,
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
    MembershipUpdate,
    ResidentMembershipRead,
)
from app.progress import build_progress
from app.helpers import artisan_to_read, request_to_read, visible_reviews_query
from app.schemas import RequestRead
from app.tenancy import compound_admin, compound_artisan_ids

router = APIRouter(prefix="/admin", tags=["Admin"])

# نسبة رفض أعلى من هذا الحد تُعتبر مؤشر سلبي بحد ذاتها
REJECTION_RATE_FLAG = 0.3


# ---------- حدود المجمع ----------

def _compound_requests_query(admin: User):
    return select(ServiceRequest).where(ServiceRequest.compound_id == admin.compound_id)


def _compound_request_ids(session: Session, admin: User) -> set:
    return set(session.exec(select(ServiceRequest.id).where(ServiceRequest.compound_id == admin.compound_id)).all())


def _compound_reviews(session: Session, admin: User, visible_only: bool = True) -> List[Review]:
    query = visible_reviews_query() if visible_only else select(Review)
    query = query.join(ServiceRequest, ServiceRequest.id == Review.request_id).where(
        ServiceRequest.compound_id == admin.compound_id
    )
    return session.exec(query.order_by(Review.created_at.desc())).all()


def _compound_artisans(session: Session, admin: User) -> List[Artisan]:
    ids = compound_artisan_ids(session, admin.compound_id)
    if not ids:
        return []
    return session.exec(select(Artisan).where(Artisan.id.in_(ids))).all()


def _get_compound_request(session: Session, admin: User, request_id: int) -> ServiceRequest:
    req = session.get(ServiceRequest, request_id)
    # طلب مجمع ثاني يتعامل كأنه غير موجود
    if not req or req.compound_id != admin.compound_id:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return req



def _get_compound_resident(session: Session, admin: User, user_id: int) -> User:
    user = session.get(User, user_id)
    if not user or user.role != UserRole.customer or user.compound_id != admin.compound_id:
        raise HTTPException(status_code=404, detail="الساكن غير موجود")
    return user


@router.get("/artisans", response_model=List[ArtisanRead])
def list_all_artisans(
    verified: Optional[bool] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    artisans = _compound_artisans(session, admin)
    if verified is not None:
        artisans = [a for a in artisans if a.verified == verified]
    return [artisan_to_read(a, session) for a in sorted(artisans, key=lambda a: a.id, reverse=True)]


# ---------- سكان المجمع ----------

def _resident_read(user: User, profile: Optional[ResidentProfile]) -> ResidentMembershipRead:
    return ResidentMembershipRead(
        user_id=user.id,
        name=user.name,
        email=user.email,
        phone=profile.phone if profile else None,
        building=profile.building if profile else None,
        floor=profile.floor if profile else None,
        apartment_number=profile.apartment_number if profile else None,
        membership_status=(profile.membership_status if profile else MembershipStatus.pending).value,
    )


@router.get("/residents", response_model=List[ResidentMembershipRead])
def list_residents(
    status_filter: Optional[MembershipStatus] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    rows = session.exec(
        select(User, ResidentProfile)
        .join(ResidentProfile, ResidentProfile.user_id == User.id, isouter=True)
        .where(User.role == UserRole.customer, User.compound_id == admin.compound_id)
        .order_by(User.id.desc())
    ).all()
    results = [_resident_read(user, profile) for user, profile in rows]
    if status_filter is not None:
        results = [r for r in results if r.membership_status == status_filter.value]
    # المنتظرين أول حتى المشرف يشوفهم مباشرة
    return sorted(results, key=lambda r: r.membership_status != MembershipStatus.pending.value)


@router.put("/residents/{user_id}/membership", response_model=ResidentMembershipRead)
def update_membership(
    user_id: int,
    payload: MembershipUpdate,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    user = _get_compound_resident(session, admin, user_id)
    profile = session.exec(select(ResidentProfile).where(ResidentProfile.user_id == user.id)).first()
    if not profile:
        profile = ResidentProfile(user_id=user.id)
    profile.membership_status = MembershipStatus(payload.status)
    session.add(profile)
    approved = profile.membership_status == MembershipStatus.approved
    notify(
        session, user.id, NotificationType.general,
        "تم قبول انضمامك للمجمع" if approved else "تم رفض طلب انضمامك للمجمع",
        "صار بإمكانك طلب الخدمات" if approved else "تواصل مع إدارة المجمع للتفاصيل",
    )
    session.commit()
    session.refresh(profile)
    return _resident_read(user, profile)


# ---------- Dashboard: نظرة عامة ----------

@router.get("/stats", response_model=AdminOverviewStats)
def get_overview_stats(
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    all_artisans = _compound_artisans(session, admin)
    verified_count = sum(1 for a in all_artisans if a.verified)
    rejected_count = sum(1 for a in all_artisans if not a.verified and a.rejected)

    all_requests = session.exec(_compound_requests_query(admin)).all()
    by_status = {s: 0 for s in RequestStatus}
    for r in all_requests:
        by_status[r.status] += 1

    customers_count = len(session.exec(
        select(User.id).where(User.role == UserRole.customer, User.compound_id == admin.compound_id)
    ).all())

    all_reviews = _compound_reviews(session, admin)
    overall_avg = (
        round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
        if all_reviews
        else None
    )

    return AdminOverviewStats(
        artisans=ArtisanCountStats(
            total=len(all_artisans),
            verified=verified_count,
            pending=len(all_artisans) - verified_count - rejected_count,
        ),
        requests=RequestCountStats(
            pending=by_status[RequestStatus.pending],
            accepted=by_status[RequestStatus.accepted],
            rejected=by_status[RequestStatus.rejected],
            in_progress=by_status[RequestStatus.in_progress],
            completed=by_status[RequestStatus.completed],
            cancelled=by_status[RequestStatus.cancelled],
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
    admin: User = Depends(compound_admin),
):
    services = session.exec(select(Service)).all()
    all_reviews = _compound_reviews(session, admin)
    overall_avg = (
        round(sum(r.rating for r in all_reviews) / len(all_reviews), 2)
        if all_reviews
        else None
    )

    results: List[ServiceStat] = []
    for service in services:
        requests = session.exec(
            _compound_requests_query(admin).where(ServiceRequest.service_id == service.id)
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

def _review_detailed(rv: Review, session: Session) -> ReviewDetailed:
    customer = session.get(User, rv.customer_id)
    artisan = session.get(Artisan, rv.artisan_id)
    artisan_user = session.get(User, artisan.user_id) if artisan else None
    req = session.get(ServiceRequest, rv.request_id)
    service = session.get(Service, req.service_id) if req else None
    return ReviewDetailed(
        id=rv.id,
        rating=rv.rating,
        comment=rv.comment,
        created_at=rv.created_at,
        customer_name=customer.name if customer else None,
        artisan_name=artisan_user.name if artisan_user else None,
        service_name=service.name if service else None,
        request_id=rv.request_id,
        request_title=(req.title or (service.name if service else None)) if req else None,
        is_hidden=rv.is_hidden,
    )


@router.get("/reviews", response_model=List[ReviewDetailed])
def get_all_reviews(
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    return [_review_detailed(rv, session) for rv in _compound_reviews(session, admin, visible_only=False)]


@router.put("/requests/{request_id}/review/visibility", response_model=ReviewDetailed)
def toggle_review_visibility(
    request_id: int,
    hidden: Optional[bool] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    """بدون ?hidden= يقلب الحالة؛ ?hidden=true/false يثبتها."""
    _get_compound_request(session, admin, request_id)
    rv = session.exec(select(Review).where(Review.request_id == request_id)).first()
    if not rv:
        raise HTTPException(status_code=404, detail="ماكو تقييم لهذا الطلب")
    rv.is_hidden = (not rv.is_hidden) if hidden is None else hidden
    session.add(rv)
    session.commit()
    session.refresh(rv)
    return _review_detailed(rv, session)


# ---------- Dashboard: مراقبة كل عملية بشريط تقدّم دقيق ----------

@router.get("/requests", response_model=List[RequestRead])
def get_all_requests(
    status_filter: Optional[RequestStatus] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    """كل طلبات المجمع بكامل التفاصيل (الساكن، الحرفي، الخدمة، البناية، التقييم، شريط التقدم)."""
    query = _compound_requests_query(admin)
    if status_filter is not None:
        query = query.where(ServiceRequest.status == status_filter)
    requests = session.exec(query.order_by(ServiceRequest.created_at.desc())).all()
    return [request_to_read(req, session) for req in requests]

@router.get("/artisans/activity", response_model=List[ArtisanActivityStat])
def get_artisans_activity(
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)

    artisans = _compound_artisans(session, admin)
    all_requests = session.exec(_compound_requests_query(admin)).all()

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
    admin: User = Depends(compound_admin),
):
    req = _get_compound_request(session, admin, request_id)
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="نكدر نعيّن حرفي بس للطلبات المعلقة")

    # الحرفي لازم يكون من شركة متفقة ويه المجمع على نفس الخدمة
    if artisan_id not in compound_artisan_ids(session, admin.compound_id, req.service_id):
        raise HTTPException(status_code=404, detail="الحرفي غير موجود أو غير معتمد")
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


# ---------- المدفوعات (تجريبي) ----------

@router.get("/payments/summary", response_model=PaymentsSummary)
def payments_summary(
    month: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    """ملخص الشهر (?month=YYYY-MM، بدونه الشهر الحالي) لطلبات المجمع المكتملة."""
    return summarize(session.exec(_compound_requests_query(admin)).all(), month)


# ---------- الشكاوى من السكان ----------

def _get_compound_complaint(session: Session, admin: User, complaint_id: int) -> Complaint:
    c = session.get(Complaint, complaint_id)
    customer = session.get(User, c.customer_id) if c else None
    if not c or not customer or customer.compound_id != admin.compound_id:
        raise HTTPException(status_code=404, detail="الشكوى غير موجودة")
    return c


@router.get("/complaints", response_model=List[ComplaintRead])
def list_complaints(
    status_filter: Optional[ComplaintStatus] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(compound_admin),
):
    query = (
        select(Complaint)
        .join(User, User.id == Complaint.customer_id)
        .where(User.compound_id == admin.compound_id)
    )
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
    admin: User = Depends(compound_admin),
):
    c = _get_compound_complaint(session, admin, complaint_id)

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
