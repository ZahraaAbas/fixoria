"""
لوحة مالك المنصة (/owner/*) — كلها لدور owner بس:
GET  /owner/overview                    -> أرقام عامة عن كل المجمعات
GET  /owner/compounds                   -> المجمعات ويه عدد السكان والطلبات ومشرفيها وشركاتها
POST /owner/compounds                   -> إضافة مجمع
PUT  /owner/compounds/{id}              -> تعديل مجمع (الاسم/العنوان/الهاتف/فعّال)
POST /owner/compounds/{id}/admins       -> إضافة مشرف مجمع (حساب جديد بدور admin)
GET  /owner/companies                   -> شركات الصيانة ويه عدد حرفييها ومدرائها ومجمعاتها
POST /owner/companies                   -> إضافة شركة
PUT  /owner/companies/{id}              -> تعديل شركة
POST /owner/companies/{id}/managers     -> إضافة مدير شركة (حساب جديد بدور company_manager)
GET  /owner/agreements                  -> الاتفاقيات (مجمع ↔ شركة) والخدمات المشمولة
POST /owner/agreements                  -> اتفاقية جديدة
PUT  /owner/agreements/{id}             -> تعديل الخدمات أو إيقاف/تفعيل الاتفاقية
"""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from app.auth import hash_password, require_role
from app.database import get_session
from app.models import (
    Agreement, AgreementServiceLink, Company, Compound, MembershipStatus, RequestStatus,
    ResidentProfile, Service, ServiceRequest, User, UserRole,
)
from app.schemas import (
    AgreementCreate, AgreementRead, AgreementUpdate, CompanyCreate, CompanyRead, CompanyUpdate,
    CompoundCreate, CompoundRead, CompoundUpdate, OwnerOverview, StaffCreate, StaffRead,
)

router = APIRouter(prefix="/owner", tags=["Owner"])

owner_only = require_role(UserRole.owner)
OPEN_STATUSES = (RequestStatus.pending, RequestStatus.accepted, RequestStatus.in_progress)


# ---------- مساعدات ----------

def _clean_name(name: str) -> str:
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="الاسم مطلوب")
    return name


def _ensure_unique_name(session: Session, model, name: str, exclude_id: int = None) -> None:
    for row in session.exec(select(model).where(model.name == name)).all():
        if row.id != exclude_id:
            raise HTTPException(status_code=400, detail="الاسم مستخدم مسبقاً")


def _get_or_404(session: Session, model, item_id: int, label: str):
    item = session.get(model, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"{label} غير موجود")
    return item


def _staff(session: Session, role: UserRole, link_field: str) -> Dict[int, List[StaffRead]]:
    """الموظفين (مشرفين أو مدراء) مجمّعين حسب المجمع أو الشركة (link_field = compound_id أو company_id)."""
    grouped: Dict[int, List[StaffRead]] = {}
    for u in session.exec(select(User).where(User.role == role).order_by(User.id)).all():
        link_id = getattr(u, link_field)
        if link_id is not None:
            grouped.setdefault(link_id, []).append(StaffRead(id=u.id, name=u.name, email=u.email))
    return grouped


def _active_partner_names(session: Session) -> tuple:
    """أسماء الشركات لكل مجمع، وأسماء المجمعات لكل شركة (من الاتفاقيات الفعالة)."""
    rows = session.exec(
        select(Agreement.compound_id, Agreement.company_id, Compound.name, Company.name)
        .join(Compound, Compound.id == Agreement.compound_id)
        .join(Company, Company.id == Agreement.company_id)
        .where(Agreement.is_active == True)  # noqa: E712
        .order_by(Agreement.id)
    ).all()
    companies_by_compound: Dict[int, List[str]] = {}
    compounds_by_company: Dict[int, List[str]] = {}
    for compound_id, company_id, compound_name, company_name in rows:
        companies_by_compound.setdefault(compound_id, []).append(company_name)
        compounds_by_company.setdefault(company_id, []).append(compound_name)
    return companies_by_compound, compounds_by_company


def _create_staff(session: Session, payload: StaffCreate, role: UserRole, **link) -> StaffRead:
    email = str(payload.email).strip()
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(status_code=400, detail="هذا الإيميل مسجل مسبقاً")
    user = User(name=_clean_name(payload.name), email=email,
                password_hash=hash_password(payload.password), role=role, **link)
    session.add(user)
    session.commit()
    session.refresh(user)
    return StaffRead(id=user.id, name=user.name, email=user.email)


def _check_services(session: Session, service_ids: List[int]) -> List[int]:
    ids = sorted(set(service_ids))
    found = session.exec(select(Service.id).where(Service.id.in_(ids))).all()
    if len(found) != len(ids):
        raise HTTPException(status_code=400, detail="خدمة غير موجودة بالاتفاقية")
    return ids


# ---------- نظرة عامة ----------

@router.get("/overview", response_model=OwnerOverview)
def overview(session: Session = Depends(get_session), _: User = Depends(owner_only)):
    count = lambda query: session.exec(query).one()  # noqa: E731
    residents = select(func.count()).select_from(User).where(User.role == UserRole.customer)
    return OwnerOverview(
        compounds=count(select(func.count()).select_from(Compound)),
        active_compounds=count(select(func.count()).select_from(Compound).where(Compound.is_active == True)),  # noqa: E712
        companies=count(select(func.count()).select_from(Company)),
        active_agreements=count(select(func.count()).select_from(Agreement).where(Agreement.is_active == True)),  # noqa: E712
        residents=count(residents),
        pending_residents=count(
            select(func.count()).select_from(ResidentProfile)
            .where(ResidentProfile.membership_status == MembershipStatus.pending)
        ),
        artisans=count(select(func.count()).select_from(User).where(User.role == UserRole.artisan)),
        requests=count(select(func.count()).select_from(ServiceRequest)),
        open_requests=count(
            select(func.count()).select_from(ServiceRequest).where(ServiceRequest.status.in_(OPEN_STATUSES))
        ),
    )


# ---------- المجمعات ----------

def _compound_reads(session: Session, compounds: List[Compound]) -> List[CompoundRead]:
    residents = dict(session.exec(
        select(User.compound_id, func.count()).where(User.role == UserRole.customer).group_by(User.compound_id)
    ).all())
    pending = dict(session.exec(
        select(User.compound_id, func.count())
        .join(ResidentProfile, ResidentProfile.user_id == User.id)
        .where(ResidentProfile.membership_status == MembershipStatus.pending)
        .group_by(User.compound_id)
    ).all())
    requests = dict(session.exec(
        select(ServiceRequest.compound_id, func.count()).group_by(ServiceRequest.compound_id)
    ).all())
    admins = _staff(session, UserRole.admin, "compound_id")
    companies_by_compound, _ = _active_partner_names(session)
    return [
        CompoundRead(
            id=c.id, name=c.name, address=c.address, phone=c.phone, is_active=c.is_active,
            created_at=c.created_at, residents=residents.get(c.id, 0), pending_residents=pending.get(c.id, 0),
            requests=requests.get(c.id, 0), admins=admins.get(c.id, []),
            companies=companies_by_compound.get(c.id, []),
        )
        for c in compounds
    ]


@router.get("/compounds", response_model=List[CompoundRead])
def list_compounds(session: Session = Depends(get_session), _: User = Depends(owner_only)):
    return _compound_reads(session, session.exec(select(Compound).order_by(Compound.id)).all())


@router.post("/compounds", response_model=CompoundRead, status_code=status.HTTP_201_CREATED)
def create_compound(payload: CompoundCreate, session: Session = Depends(get_session), _: User = Depends(owner_only)):
    name = _clean_name(payload.name)
    _ensure_unique_name(session, Compound, name)
    compound = Compound(name=name, address=(payload.address or "").strip() or None,
                        phone=(payload.phone or "").strip() or None)
    session.add(compound)
    session.commit()
    session.refresh(compound)
    return _compound_reads(session, [compound])[0]


@router.put("/compounds/{compound_id}", response_model=CompoundRead)
def update_compound(compound_id: int, payload: CompoundUpdate,
                    session: Session = Depends(get_session), _: User = Depends(owner_only)):
    compound = _get_or_404(session, Compound, compound_id, "المجمع")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        compound.name = _clean_name(data["name"])
        _ensure_unique_name(session, Compound, compound.name, exclude_id=compound.id)
    for field in ("address", "phone"):
        if field in data:
            setattr(compound, field, (data[field] or "").strip() or None)
    if data.get("is_active") is not None:
        compound.is_active = data["is_active"]
    session.add(compound)
    session.commit()
    session.refresh(compound)
    return _compound_reads(session, [compound])[0]


@router.post("/compounds/{compound_id}/admins", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
def add_compound_admin(compound_id: int, payload: StaffCreate,
                       session: Session = Depends(get_session), _: User = Depends(owner_only)):
    _get_or_404(session, Compound, compound_id, "المجمع")
    return _create_staff(session, payload, UserRole.admin, compound_id=compound_id)


# ---------- الشركات ----------

def _company_reads(session: Session, companies: List[Company]) -> List[CompanyRead]:
    artisans = dict(session.exec(
        select(User.company_id, func.count()).where(User.role == UserRole.artisan).group_by(User.company_id)
    ).all())
    managers = _staff(session, UserRole.company_manager, "company_id")
    _, compounds_by_company = _active_partner_names(session)
    return [
        CompanyRead(
            id=c.id, name=c.name, phone=c.phone, is_active=c.is_active, created_at=c.created_at,
            artisans=artisans.get(c.id, 0), managers=managers.get(c.id, []),
            compounds=compounds_by_company.get(c.id, []),
        )
        for c in companies
    ]


@router.get("/companies", response_model=List[CompanyRead])
def list_companies(session: Session = Depends(get_session), _: User = Depends(owner_only)):
    return _company_reads(session, session.exec(select(Company).order_by(Company.id)).all())


@router.post("/companies", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreate, session: Session = Depends(get_session), _: User = Depends(owner_only)):
    name = _clean_name(payload.name)
    _ensure_unique_name(session, Company, name)
    company = Company(name=name, phone=(payload.phone or "").strip() or None)
    session.add(company)
    session.commit()
    session.refresh(company)
    return _company_reads(session, [company])[0]


@router.put("/companies/{company_id}", response_model=CompanyRead)
def update_company(company_id: int, payload: CompanyUpdate,
                   session: Session = Depends(get_session), _: User = Depends(owner_only)):
    company = _get_or_404(session, Company, company_id, "الشركة")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        company.name = _clean_name(data["name"])
        _ensure_unique_name(session, Company, company.name, exclude_id=company.id)
    if "phone" in data:
        company.phone = (data["phone"] or "").strip() or None
    if data.get("is_active") is not None:
        company.is_active = data["is_active"]
    session.add(company)
    session.commit()
    session.refresh(company)
    return _company_reads(session, [company])[0]


@router.post("/companies/{company_id}/managers", response_model=StaffRead, status_code=status.HTTP_201_CREATED)
def add_company_manager(company_id: int, payload: StaffCreate,
                        session: Session = Depends(get_session), _: User = Depends(owner_only)):
    _get_or_404(session, Company, company_id, "الشركة")
    return _create_staff(session, payload, UserRole.company_manager, company_id=company_id)


# ---------- الاتفاقيات ----------

def _agreement_reads(session: Session, agreements: List[Agreement]) -> List[AgreementRead]:
    ids = [a.id for a in agreements]
    services: Dict[int, List[int]] = {}
    if ids:
        for link in session.exec(
            select(AgreementServiceLink).where(AgreementServiceLink.agreement_id.in_(ids))
            .order_by(AgreementServiceLink.service_id)
        ).all():
            services.setdefault(link.agreement_id, []).append(link.service_id)
    compounds = {c.id: c.name for c in session.exec(select(Compound)).all()}
    companies = {c.id: c.name for c in session.exec(select(Company)).all()}
    return [
        AgreementRead(
            id=a.id, compound_id=a.compound_id, compound_name=compounds.get(a.compound_id, ""),
            company_id=a.company_id, company_name=companies.get(a.company_id, ""),
            service_ids=services.get(a.id, []), is_active=a.is_active, created_at=a.created_at,
        )
        for a in agreements
    ]


def _set_services(session: Session, agreement: Agreement, service_ids: List[int]) -> None:
    for link in session.exec(select(AgreementServiceLink).where(AgreementServiceLink.agreement_id == agreement.id)).all():
        session.delete(link)
    for service_id in service_ids:
        session.add(AgreementServiceLink(agreement_id=agreement.id, service_id=service_id))


@router.get("/agreements", response_model=List[AgreementRead])
def list_agreements(session: Session = Depends(get_session), _: User = Depends(owner_only)):
    return _agreement_reads(session, session.exec(select(Agreement).order_by(Agreement.id)).all())


@router.post("/agreements", response_model=AgreementRead, status_code=status.HTTP_201_CREATED)
def create_agreement(payload: AgreementCreate, session: Session = Depends(get_session), _: User = Depends(owner_only)):
    _get_or_404(session, Compound, payload.compound_id, "المجمع")
    _get_or_404(session, Company, payload.company_id, "الشركة")
    service_ids = _check_services(session, payload.service_ids)
    if session.exec(select(Agreement).where(
        Agreement.compound_id == payload.compound_id, Agreement.company_id == payload.company_id
    )).first():
        raise HTTPException(status_code=409, detail="أكو اتفاقية مسبقاً بين هذا المجمع وهذه الشركة")
    agreement = Agreement(compound_id=payload.compound_id, company_id=payload.company_id)
    session.add(agreement)
    session.commit()
    session.refresh(agreement)
    _set_services(session, agreement, service_ids)
    session.commit()
    return _agreement_reads(session, [agreement])[0]


@router.put("/agreements/{agreement_id}", response_model=AgreementRead)
def update_agreement(agreement_id: int, payload: AgreementUpdate,
                     session: Session = Depends(get_session), _: User = Depends(owner_only)):
    agreement = _get_or_404(session, Agreement, agreement_id, "الاتفاقية")
    data = payload.model_dump(exclude_unset=True)
    if data.get("service_ids") is not None:
        _set_services(session, agreement, _check_services(session, data["service_ids"]))
    if data.get("is_active") is not None:
        agreement.is_active = data["is_active"]
        session.add(agreement)
    session.commit()
    session.refresh(agreement)
    return _agreement_reads(session, [agreement])[0]
