"""
Requests endpoints:
POST /requests                 -> Create service request (customer)
GET  /requests                 -> Requests by role (customer sees own, artisan sees assigned, admin sees all)
GET  /requests/{id}            -> Request details
PUT  /requests/{id}/status     -> Accept/Reject/In Progress/Completed (artisan or admin)

كل استجابة تتضمن حقل progress -> شريط تقدّم بـ 4 مراحل (تم الحجز / في الطريق اليك /
يتم تنفيذ العملية / تم تنفيذ العملية) عشان الزبون والأدمن يتابعون العملية بدقة.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Artisan, Service, ServiceRequest, RequestStatus, User, UserRole, NotificationType
from app.schemas import RequestCreate, RequestRead, RequestStatusUpdate
from app.auth import get_current_user
from app.progress import build_progress
from app.notifications import notify

router = APIRouter(prefix="/requests", tags=["Requests"])

# انتقالات الحالة المسموحة
ALLOWED_TRANSITIONS = {
    RequestStatus.pending: {RequestStatus.accepted, RequestStatus.rejected},
    RequestStatus.accepted: {RequestStatus.in_progress},
    RequestStatus.in_progress: {RequestStatus.completed},
    RequestStatus.rejected: set(),
    RequestStatus.completed: set(),
}


def _to_read(req: ServiceRequest, session: Session) -> RequestRead:
    data = RequestRead.model_validate(req, from_attributes=True)
    data.progress = [s.model_dump() for s in build_progress(req.status)]
    service = session.get(Service, req.service_id)
    customer = session.get(User, req.customer_id)
    data.service_name = service.name if service else None
    data.customer_name = customer.name if customer else None
    return data


@router.post("", response_model=RequestRead, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: RequestCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="بس الزبون يكدر يفتح طلب خدمة")

    artisan = session.get(Artisan, payload.artisan_id)
    if not artisan:
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")

    req = ServiceRequest(customer_id=user.id, **payload.model_dump())
    session.add(req)
    session.commit()
    session.refresh(req)

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
        reqs = session.exec(select(ServiceRequest)).all()
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

    if user.role == UserRole.artisan:
        artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
        if not artisan or req.artisan_id is None or artisan.id != req.artisan_id:
            raise HTTPException(status_code=403, detail="هذا الطلب مو إلك")

    if req.artisan_id is None and payload.status != RequestStatus.rejected.value:
        raise HTTPException(status_code=400, detail="الطلب ما انربط بحرفي بعد")

    try:
        new_status = RequestStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="حالة غير معروفة")

    if new_status not in ALLOWED_TRANSITIONS.get(req.status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"ما يمكن الانتقال من {req.status} إلى {new_status}",
        )

    req.status = new_status
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
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.customer and req.customer_id == user.id:
        return
    if user.role == UserRole.artisan:
        artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
        if artisan and artisan.id == req.artisan_id:
            return
    raise HTTPException(status_code=403, detail="ما تكدرين تشوفين هذا الطلب")
