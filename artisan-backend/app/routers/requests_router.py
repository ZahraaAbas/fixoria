"""
Requests endpoints:
POST /requests                 -> Create service request (customer)
GET  /requests                 -> Requests by role (customer sees own, artisan sees assigned, admin sees all)
GET  /requests/available       -> (حرفي) الطلبات المفتوحة بخدماته + المرسلة إله وبانتظار قبوله
GET  /requests/{id}            -> Request details
PUT  /requests/{id}/status     -> Accept/Reject/In Progress/Completed (artisan or admin)
                                  قبول طلب مفتوح (بدون حرفي) = الحرفي ياخذه؛ إذا أحد سبقه -> 409
POST /requests/{id}/dismiss    -> (حرفي) تجاهل طلب — يختفي من قائمته؛ وإذا كان مرسل إله يرجع مفتوح للباقين

كل استجابة تتضمن حقل progress -> شريط تقدّم بـ 4 مراحل (تم الحجز / في الطريق اليك /
يتم تنفيذ العملية / تم تنفيذ العملية) عشان الزبون والأدمن يتابعون العملية بدقة.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    PaymentMethod, PaymentStatus,
    Artisan, RequestDismissal, ServiceRequest, RequestStatus, User, UserRole, NotificationType,
)
from app.helpers import artisan_service_ids, request_to_read
from app.schemas import RequestCreate, RequestRead, RequestStatusUpdate
from app.auth import get_current_user
from app.tenancy import approved_resident, company_coverage, compound_artisan_ids, request_in_coverage
from app.progress import build_progress
from app.history import record_event, record_status_change
from app.dispatch import open_to_artisan_company
from app.notifications import notify

router = APIRouter(prefix="/requests", tags=["Requests"])

# انتقالات الحالة المسموحة
ALLOWED_TRANSITIONS = {
    RequestStatus.pending: {RequestStatus.accepted, RequestStatus.rejected},
    RequestStatus.accepted: {RequestStatus.in_progress},
    RequestStatus.in_progress: {RequestStatus.completed},
    RequestStatus.rejected: set(),
    RequestStatus.completed: set(),
    RequestStatus.cancelled: set(),
}


def _to_read(req: ServiceRequest, session: Session) -> RequestRead:
    return request_to_read(req, session)


def _my_artisan(session: Session, user: User) -> Artisan:
    artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="ماكو ملف حرفي إلك بعد")
    return artisan


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    session: Session = Depends(get_session),
    user: User = Depends(approved_resident),
):
    artisan = session.get(Artisan, payload.artisan_id)
    if not artisan or artisan.id not in compound_artisan_ids(session, user.compound_id, payload.service_id):
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")

    req = ServiceRequest(customer_id=user.id, compound_id=user.compound_id, **payload.model_dump())
    session.add(req)
    session.commit()
    session.refresh(req)
    record_event(session, req, "created", user)

    notify(session, user.id, NotificationType.request_received,
           f"تم استلام طلبك رقم #{req.id}", "بانتظار قبول الحرفي", req.id)
    notify(session, artisan.user_id, NotificationType.new_request,
           f"وصلك طلب جديد رقم #{req.id}", req.description, req.id)
    session.commit()
    return _to_read(req, session)


@router.get("", response_model=List[RequestRead])
def list_requests(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.admin:
        # مشرف المجمع يشوف طلبات مجمعه بس
        reqs = session.exec(select(ServiceRequest).where(ServiceRequest.compound_id == user.compound_id)).all()
    elif user.role == UserRole.customer:
        reqs = session.exec(
            select(ServiceRequest).where(ServiceRequest.customer_id == user.id)
        ).all()
    else:
        # artisan: يشوف الطلبات المرسلة إله بس
        artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
        reqs = (
            session.exec(
                select(ServiceRequest).where(ServiceRequest.artisan_id == artisan.id)
            ).all()
            if artisan
            else []
        )

    return [_to_read(r, session) for r in reqs]


@router.get("/available", response_model=List[RequestRead])
def list_available_requests(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """
    طلبات الحرفي الجديدة:
    - طلبات مفتوحة (بدون حرفي) بأي خدمة من خدماته، من المجمعات المتفقة ويه شركته على هذي الخدمة
    - طلبات الساكن اختاره بيها بالاسم (مشترك) وبعدها بانتظار قبوله
    ناقص اللي تجاهلها.
    """
    if user.role != UserRole.artisan:
        raise HTTPException(status_code=403, detail="هذي الصفحة للحرفيين بس")
    artisan = _my_artisan(session, user)
    if not artisan.verified:
        return []

    my_services = set(artisan_service_ids(session, artisan))
    coverage = company_coverage(session, user.company_id)
    dismissed = {
        d.request_id
        for d in session.exec(
            select(RequestDismissal).where(RequestDismissal.artisan_id == artisan.id)
        ).all()
    }
    pending = session.exec(
        select(ServiceRequest)
        .where(ServiceRequest.status == RequestStatus.pending)
        .order_by(ServiceRequest.created_at.desc())
    ).all()

    now = datetime.utcnow()
    results = [
        r for r in pending
        if r.id not in dismissed
        and (r.artisan_id == artisan.id or (
            r.artisan_id is None and r.service_id in my_services and request_in_coverage(coverage, r)
            # وضع "الشركة توزّع": يبين بس بعد مهلة التوزيع، ولحرفيي نفس الشركة
            and open_to_artisan_company(r, user.company_id, now)
        ))
    ]
    return [_to_read(r, session) for r in results]


@router.post("/{request_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_request(
    request_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.artisan:
        raise HTTPException(status_code=403, detail="بس الحرفي يكدر يتجاهل طلب")
    artisan = _my_artisan(session, user)
    req = session.get(ServiceRequest, request_id)
    if not req or (req.artisan_id != artisan.id
                   and not request_in_coverage(company_coverage(session, user.company_id), req)):
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    if not session.get(RequestDismissal, (artisan.id, req.id)):
        session.add(RequestDismissal(artisan_id=artisan.id, request_id=req.id))

    # طلب كان مرسل لهذا الحرفي بالاسم -> يرجع مفتوح لباقي حرفيي الخدمة
    if req.artisan_id == artisan.id and req.status == RequestStatus.pending:
        req.artisan_id = None
        session.add(req)
        notify(session, req.customer_id, NotificationType.request_received,
               f"طلبك رقم #{req.id} رجع مفتوح",
               "الحرفي اللي اخترته غير متاح — جاري البحث عن حرفي مناسب", req.id)
    session.commit()
    return None


@router.post("/{request_id}/cash-received", response_model=RequestRead)
def confirm_cash_received(
    request_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """الحرفي يأكد إنه استلم المبلغ كاش (تجريبي) — حتى لو الساكن ما اختار الطريقة بعد."""
    if user.role != UserRole.artisan:
        raise HTTPException(status_code=403, detail="بس الحرفي يأكد الاستلام")
    artisan = _my_artisan(session, user)
    req = session.get(ServiceRequest, request_id)
    if not req or req.artisan_id != artisan.id:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if req.status != RequestStatus.completed:
        raise HTTPException(status_code=400, detail="الطلب ما اكتمل بعد")
    if req.price is None:
        raise HTTPException(status_code=400, detail="حدد السعر أول")
    if req.payment_status == PaymentStatus.paid:
        raise HTTPException(status_code=409, detail="هذا الطلب مدفوع مسبقاً")

    req.payment_method = PaymentMethod.cash
    req.payment_status = PaymentStatus.paid
    req.paid_at = datetime.utcnow()
    session.add(req)
    notify(session, req.customer_id, NotificationType.payment_update,
           f"تم تأكيد دفع طلبك رقم #{req.id}", f"{req.price:,} د.ع — كاش", req.id)
    session.commit()
    session.refresh(req)
    return _to_read(req, session)


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    _check_can_view(req, user, session)
    return _to_read(req, session)


@router.put("/{request_id}/status", response_model=RequestRead)
def update_status(
    request_id: int,
    payload: RequestStatusUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    if user.role == UserRole.customer:
        raise HTTPException(status_code=403, detail="الزبون ما يكدر يغير حالة الطلب")
    if user.role == UserRole.admin and (user.compound_id is None or req.compound_id != user.compound_id):
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if user.role not in (UserRole.artisan, UserRole.admin):
        raise HTTPException(status_code=403, detail="ماكو صلاحية لهذا الإجراء")

    try:
        new_status = RequestStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="حالة غير معروفة")
    if new_status == RequestStatus.cancelled:
        raise HTTPException(status_code=400, detail="الإلغاء من الساكن بس")

    if user.role == UserRole.artisan:
        artisan = _my_artisan(session, user)
        if not artisan.verified:
            raise HTTPException(status_code=403, detail="حسابك بانتظار توثيق الإدارة")

        if req.artisan_id is None:
            # طلب مفتوح: القبول = الحرفي ياخذ الطلب
            if req.status != RequestStatus.pending:
                raise HTTPException(status_code=409, detail="هذا الطلب ما عاد متاح")
            if req.service_id not in artisan_service_ids(session, artisan):
                raise HTTPException(status_code=403, detail="هذا الطلب مو ضمن خدماتك")
            if not request_in_coverage(company_coverage(session, user.company_id), req):
                raise HTTPException(status_code=404, detail="الطلب غير موجود")
            if not open_to_artisan_company(req, user.company_id):
                raise HTTPException(status_code=409, detail="الطلب بانتظار توزيع شركة الصيانة")
            if new_status != RequestStatus.accepted:
                raise HTTPException(status_code=400, detail="الطلب المفتوح يا تقبله يا تتجاهله")
            req.artisan_id = artisan.id
        elif req.artisan_id != artisan.id:
            # حرفي ثاني سبقه
            raise HTTPException(status_code=409, detail="حرفي آخر قبل هذا الطلب")

    elif req.artisan_id is None and new_status != RequestStatus.rejected:
        raise HTTPException(status_code=400, detail="الطلب ما انربط بحرفي بعد")

    if new_status not in ALLOWED_TRANSITIONS.get(req.status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"ما يمكن الانتقال من {req.status} إلى {new_status}",
        )

    req.status = new_status
    record_status_change(session, req, user)
    if payload.scheduled_at is not None:
        req.scheduled_at = payload.scheduled_at
    if new_status == RequestStatus.rejected:
        req.rejection_reason = payload.rejection_reason
    if new_status == RequestStatus.completed:
        req.completed_at = datetime.utcnow()
        if payload.price is not None:
            if payload.price < 0:
                raise HTTPException(status_code=400, detail="السعر ما يكون سالب")
            req.price = payload.price

    session.add(req)
    _notify_customer_of_status(req, session)
    session.commit()
    session.refresh(req)
    return _to_read(req, session)


def _artisan_name(req: ServiceRequest, session: Session) -> str:
    artisan = session.get(Artisan, req.artisan_id) if req.artisan_id else None
    artisan_user = session.get(User, artisan.user_id) if artisan else None
    return artisan_user.name if artisan_user else "الحرفي"


def _notify_customer_of_status(req: ServiceRequest, session: Session) -> None:
    """إشعار للساكن بكل تغيير حالة (يظهر بخانة الإشعارات بلوحة الساكن)."""
    name = _artisan_name(req, session)
    if req.status == RequestStatus.accepted:
        notify(session, req.customer_id, NotificationType.request_accepted,
               f"تم قبول طلبك رقم #{req.id}", f"من قبل الحرفي {name}", req.id)
    elif req.status == RequestStatus.rejected:
        reason = req.rejection_reason or "غير محدد"
        notify(session, req.customer_id, NotificationType.request_rejected,
               f"تم رفض طلبك رقم #{req.id}", f"السبب: {reason}", req.id)
    elif req.status == RequestStatus.in_progress:
        notify(session, req.customer_id, NotificationType.request_in_progress,
               f"طلبك رقم #{req.id} قيد التنفيذ", f"الحرفي {name} بدأ العمل", req.id)
    elif req.status == RequestStatus.completed:
        notify(session, req.customer_id, NotificationType.request_completed,
               f"تم إكمال طلبك رقم #{req.id}", f"قيّم تجربتك مع الحرفي {name}", req.id)


def _check_can_view(req: ServiceRequest, user: User, session: Session) -> None:
    if user.role == UserRole.admin and user.compound_id is not None and req.compound_id == user.compound_id:
        return
    if user.role == UserRole.customer and req.customer_id == user.id:
        return
    if user.role == UserRole.artisan:
        artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
        if artisan and artisan.id == req.artisan_id:
            return
        # طلب مفتوح ضمن خدماته (يشوف تفاصيله قبل ما يقبله)
        if (artisan and req.artisan_id is None and req.status == RequestStatus.pending
                and req.service_id in artisan_service_ids(session, artisan)
                and request_in_coverage(company_coverage(session, user.company_id), req)):
            return
    raise HTTPException(status_code=403, detail="ما تكدرين تشوفين هذا الطلب")
