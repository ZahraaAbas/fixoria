"""
لوحة مدير شركة الصيانة (/company/*) — كلها لدور company_manager، محددة بشركته:
GET  /company/overview              -> الشركة، حرفيوها، المجمعات المتفقة وخدماتها، وأرقام الطلبات
GET  /company/artisans              -> حرفيو الشركة
POST /company/artisans              -> إضافة حرفي (حساب جديد مفعّل مباشرة)
PUT  /company/artisans/{id}         -> تعديل الهاتف/النبذة/الخدمات أو إيقاف/تفعيل الحرفي
GET  /company/requests              -> طلبات حرفيي الشركة + الطلبات المفتوحة بمجمعاتها (?status_filter=)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlmodel import Session, select

from app.auth import hash_password
from app.database import get_session
from app.helpers import artisan_to_read, request_to_read, set_artisan_services
from app.models import (
    Agreement, AgreementServiceLink, Artisan, ArtisanServiceLink, Company, Compound, NotificationType,
    RequestStatus, Service, ServiceRequest, User, UserRole,
)
from app.payments import summarize
from app.schemas import (
    PaymentsSummary,
    ArtisanRead, CompanyArtisanCreate, CompanyArtisanUpdate, CompanyCompoundRead, CompanyOverview, RequestRead,
)
from app.tenancy import company_coverage, company_manager, request_in_coverage
from app.dispatch import MINUTES as DISPATCH_MINUTES, in_dispatch_window
from app.history import record_event
from app.notifications import notify
from app.schemas import DispatchSettings

router = APIRouter(prefix="/company", tags=["Company"])

OPEN = (RequestStatus.pending,)
ACTIVE = (RequestStatus.accepted, RequestStatus.in_progress)


def _company_artisans(session: Session, manager: User) -> List[Artisan]:
    return session.exec(
        select(Artisan).join(User, User.id == Artisan.user_id)
        .where(User.company_id == manager.company_id, User.role == UserRole.artisan)
        .order_by(Artisan.id.desc())
    ).all()


def _get_company_artisan(session: Session, manager: User, artisan_id: int) -> Artisan:
    artisan = session.get(Artisan, artisan_id)
    owner = session.get(User, artisan.user_id) if artisan else None
    if not artisan or not owner or owner.company_id != manager.company_id:
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")
    return artisan


def _check_services(session: Session, service_ids: List[int]) -> List[int]:
    ids = list(dict.fromkeys(service_ids))
    if not ids:
        raise HTTPException(status_code=400, detail="اختر خدمة وحدة على الأقل")
    if len(session.exec(select(Service.id).where(Service.id.in_(ids))).all()) != len(ids):
        raise HTTPException(status_code=400, detail="الخدمات المختارة غير موجودة")
    return ids


def _company_requests(session: Session, manager: User) -> List[ServiceRequest]:
    """طلبات حرفيي الشركة، والطلبات المفتوحة (بدون حرفي) اللي تغطيها اتفاقيات الشركة."""
    artisan_ids = [a.id for a in _company_artisans(session, manager)]
    coverage = company_coverage(session, manager.company_id)
    compound_ids = sorted({compound_id for compound_id, _ in coverage})
    rows = session.exec(
        select(ServiceRequest)
        .where(or_(
            ServiceRequest.artisan_id.in_(artisan_ids or [-1]),
            and_(ServiceRequest.artisan_id.is_(None), ServiceRequest.status.in_(OPEN),
                 ServiceRequest.compound_id.in_(compound_ids or [-1])),
        ))
        .order_by(ServiceRequest.created_at.desc())
    ).all()
    # المفتوحة لازم تكون بخدمة تغطيها الاتفاقية (مو بس بنفس المجمع)، ومو موجّهة لشركة ثانية توزّعها
    return [
        r for r in rows
        if r.artisan_id is not None
        or (request_in_coverage(coverage, r) and r.company_id in (None, manager.company_id))
    ]


@router.get("/overview", response_model=CompanyOverview)
def overview(session: Session = Depends(get_session), manager: User = Depends(company_manager)):
    company = session.get(Company, manager.company_id)
    artisans = _company_artisans(session, manager)

    agreements = session.exec(
        select(Agreement, Compound)
        .join(Compound, Compound.id == Agreement.compound_id)
        .where(Agreement.company_id == manager.company_id, Agreement.is_active == True)  # noqa: E712
        .order_by(Compound.name)
    ).all()
    names = {s.id: s.name for s in session.exec(select(Service)).all()}
    compounds = []
    for agreement, compound in agreements:
        service_ids = sorted(session.exec(
            select(AgreementServiceLink.service_id).where(AgreementServiceLink.agreement_id == agreement.id)
        ).all())
        compounds.append(CompanyCompoundRead(
            compound_id=compound.id, compound_name=compound.name, compound_active=compound.is_active,
            service_ids=service_ids, service_names=[names[i] for i in service_ids if i in names],
        ))

    requests = _company_requests(session, manager)
    return CompanyOverview(
        company_name=company.name if company else "",
        company_active=bool(company and company.is_active),
        artisans=len(artisans),
        active_artisans=sum(1 for a in artisans if a.verified),
        compounds=compounds,
        open_requests=sum(1 for r in requests if r.artisan_id is None and r.status in OPEN),
        active_requests=sum(1 for r in requests if r.status in ACTIVE),
        completed_requests=sum(1 for r in requests if r.status == RequestStatus.completed),
        awaiting_dispatch=sum(1 for r in requests if r.company_id == manager.company_id and in_dispatch_window(r)),
        dispatch_mode=company.dispatch_mode if company else "open",
        dispatch_minutes=company.dispatch_minutes if company else 30,
    )


@router.put("/settings/dispatch", response_model=DispatchSettings)
def update_dispatch(payload: DispatchSettings, session: Session = Depends(get_session),
                    manager: User = Depends(company_manager)):
    """طريقة توزيع الطلبات: open (الحرفيين يقبلون) أو company (المدير يوزّع خلال المهلة)."""
    if payload.dispatch_minutes not in DISPATCH_MINUTES:
        raise HTTPException(status_code=400, detail="مهلة غير مسموحة")
    company = session.get(Company, manager.company_id)
    company.dispatch_mode = payload.dispatch_mode
    company.dispatch_minutes = payload.dispatch_minutes
    session.add(company)
    session.commit()
    return DispatchSettings(dispatch_mode=company.dispatch_mode, dispatch_minutes=company.dispatch_minutes)


@router.put("/requests/{request_id}/assign", response_model=RequestRead)
def assign_request(request_id: int, artisan_id: int, session: Session = Depends(get_session),
                   manager: User = Depends(company_manager)):
    """المدير يعيّن حرفي من شركته لطلب معلّق ضمن نطاقه. الحرفي يوصله إشعار ويقبل."""
    req = next((r for r in _company_requests(session, manager) if r.id == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if req.status != RequestStatus.pending:
        raise HTTPException(status_code=400, detail="نكدر نعيّن حرفي بس للطلبات المعلقة")
    artisan = _get_company_artisan(session, manager, artisan_id)
    if not artisan.verified:
        raise HTTPException(status_code=400, detail="الحرفي موقوف")
    if req.service_id not in set(s.service_id for s in session.exec(
        select(ArtisanServiceLink).where(ArtisanServiceLink.artisan_id == artisan.id)
    ).all()):
        raise HTTPException(status_code=400, detail="هذا الحرفي ما يقدم الخدمة المطلوبة")
    if req.artisan_id is not None and req.artisan_id not in {a.id for a in _company_artisans(session, manager)}:
        raise HTTPException(status_code=409, detail="الطلب عند حرفي من شركة ثانية")

    req.artisan_id = artisan.id
    req.company_id = manager.company_id
    session.add(req)
    record_event(session, req, "assigned", manager)
    artisan_user = session.get(User, artisan.user_id)
    notify(session, req.customer_id, NotificationType.request_assigned,
           f"تم تعيين حرفي لطلبك رقم #{req.id}",
           f"الحرفي {artisan_user.name if artisan_user else ''} — بانتظار القبول", req.id)
    notify(session, artisan.user_id, NotificationType.new_request,
           f"وصلك طلب جديد رقم #{req.id}", req.location, req.id)
    session.commit()
    session.refresh(req)
    return request_to_read(req, session)


@router.get("/artisans", response_model=List[ArtisanRead])
def list_artisans(session: Session = Depends(get_session), manager: User = Depends(company_manager)):
    return [artisan_to_read(a, session) for a in _company_artisans(session, manager)]


@router.post("/artisans", response_model=ArtisanRead, status_code=status.HTTP_201_CREATED)
def create_artisan(payload: CompanyArtisanCreate, session: Session = Depends(get_session),
                   manager: User = Depends(company_manager)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="الاسم مطلوب")
    email = str(payload.email).strip()
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="هذا الإيميل مسجل مسبقاً")
    service_ids = _check_services(session, payload.service_ids)

    user = User(name=name, email=email, password_hash=hash_password(payload.password),
                role=UserRole.artisan, company_id=manager.company_id)
    session.add(user)
    session.commit()
    session.refresh(user)
    # الشركة هي اللي تضيفه، فينضاف مفعّل مباشرة
    artisan = Artisan(user_id=user.id, phone=payload.phone.strip(), specialty="",
                      description=(payload.description or "").strip() or None, verified=True)
    session.add(artisan)
    session.commit()
    session.refresh(artisan)
    set_artisan_services(session, artisan, service_ids)
    session.commit()
    session.refresh(artisan)
    return artisan_to_read(artisan, session)


@router.put("/artisans/{artisan_id}", response_model=ArtisanRead)
def update_artisan(artisan_id: int, payload: CompanyArtisanUpdate, session: Session = Depends(get_session),
                   manager: User = Depends(company_manager)):
    artisan = _get_company_artisan(session, manager, artisan_id)
    data = payload.model_dump(exclude_unset=True)
    if "phone" in data and data["phone"] is not None:
        phone = data["phone"].strip()
        if not phone:
            raise HTTPException(status_code=400, detail="رقم الهاتف مطلوب")
        artisan.phone = phone
    if "description" in data:
        artisan.description = (data["description"] or "").strip() or None
    if data.get("service_ids") is not None:
        set_artisan_services(session, artisan, _check_services(session, data["service_ids"]))
    if data.get("is_active") is not None:
        # الموقوف ما يستلم طلبات ويشوف صفحة "حسابك موقوف" لمن يدخل
        artisan.verified = data["is_active"]
        artisan.rejected = not data["is_active"]
    session.add(artisan)
    session.commit()
    session.refresh(artisan)
    return artisan_to_read(artisan, session)


@router.get("/payments/summary", response_model=PaymentsSummary)
def payments_summary(month: Optional[str] = None, session: Session = Depends(get_session),
                     manager: User = Depends(company_manager)):
    """ملخص الشهر لطلبات حرفيي الشركة المكتملة (تجريبي)."""
    artisan_ids = [a.id for a in _company_artisans(session, manager)]
    rows = session.exec(select(ServiceRequest).where(ServiceRequest.artisan_id.in_(artisan_ids or [-1]))).all()
    return summarize(rows, month)


@router.get("/requests", response_model=List[RequestRead])
def list_requests(status_filter: Optional[RequestStatus] = None, session: Session = Depends(get_session),
                  manager: User = Depends(company_manager)):
    rows = _company_requests(session, manager)
    if status_filter is not None:
        rows = [r for r in rows if r.status == status_filter]
    return [request_to_read(r, session) for r in rows]
