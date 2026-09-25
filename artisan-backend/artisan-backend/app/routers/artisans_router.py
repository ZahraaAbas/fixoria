"""
Artisans endpoints:
GET  /artisans          -> List/search (?specialty=, ?location=, ?service_id=, ?verified_only=)
GET  /artisans/{id}     -> Details
POST /artisans          -> Create profile (artisan role only, one profile per user) — يقبل service_ids
PUT  /artisans/me       -> الحرفي يعدل ملفه (الاسم، الهاتف، النبذة، الخدمات)
PUT  /artisans/{id}     -> Update profile (owner or admin)
"""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Artisan, Review, Service, ServiceRequest, User, UserRole
from app.schemas import ArtisanCreate, ArtisanUpdate, ArtisanRead, ReviewDetailed
from app.auth import get_current_user, require_role
from app.analytics import extract_building, last_n_months, month_label
from app.helpers import (
    artisan_to_read, artisans_for_service, set_artisan_services, visible_reviews_query,
)

router = APIRouter(prefix="/artisans", tags=["Artisans"])


def _to_read(artisan: Artisan, session: Session) -> ArtisanRead:
    return artisan_to_read(artisan, session)


@router.get("", response_model=List[ArtisanRead])
def list_artisans(
    specialty: Optional[str] = None,
    location: Optional[str] = None,
    verified_only: bool = False,
    service_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    ?service_id= يرجع حرفيي خدمة معيّنة (صفحة "تصفح الخدمات" بالفرونت)،
    مرتبين من الأعلى تقييماً — اللي ما عنده تقييم ينزل آخر القائمة.
    """
    query = select(Artisan)
    if service_id is not None:
        ids = [a.id for a in artisans_for_service(session, service_id, verified_only=False)]
        query = query.where(Artisan.id.in_(ids))
    if specialty:
        query = query.where(Artisan.specialty.contains(specialty))
    if location:
        query = query.where(Artisan.location.contains(location))
    if verified_only:
        query = query.where(Artisan.verified == True)  # noqa: E712

    artisans = session.exec(query).all()
    results = [_to_read(a, session) for a in artisans]
    if service_id is not None:
        results.sort(key=lambda a: (a.average_rating or 0, a.reviews_count), reverse=True)
    return results


@router.get("/me", response_model=ArtisanRead)
def get_my_artisan_profile(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.artisan)),
):
    artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="ماكو ملف حرفي إلك بعد — سوي وحد أول")
    return _to_read(artisan, session)


@router.get("/me/reviews", response_model=List[ReviewDetailed])
def get_my_reviews(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.artisan)),
):
    """التقييمات اللي استلمها الحرفي — مع اسم الساكن والخدمة."""
    artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="ماكو ملف حرفي إلك بعد — سوي وحد أول")

    # التقييمات اللي أخفتها الإدارة ما تظهر للحرفي
    reviews = session.exec(
        visible_reviews_query().where(Review.artisan_id == artisan.id).order_by(Review.created_at.desc())
    ).all()
    results = []
    for rv in reviews:
        customer = session.get(User, rv.customer_id)
        req = session.get(ServiceRequest, rv.request_id)
        service = session.get(Service, req.service_id) if req else None
        results.append(ReviewDetailed(
            id=rv.id, rating=rv.rating, comment=rv.comment, created_at=rv.created_at,
            customer_name=customer.name if customer else None,
            artisan_name=user.name,
            service_name=service.name if service else None,
            request_id=rv.request_id,
            request_title=(req.title or (service.name if service else None)) if req else None,
        ))
    return results


@router.get("/me/monthly-building-stats")
def get_my_monthly_building_stats(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.artisan)),
):
    """
    خط بياني (Line Chart): عدد الطلبات خلال آخر 12 شهر، مقسّمة حسب البناية —
    يساعد الحرفي يشوف وين تراجعت الطلبات من بناية معينة.
    """
    artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="ماكو ملف حرفي إلك بعد — سوي وحد أول")

    requests = session.exec(
        select(ServiceRequest).where(ServiceRequest.artisan_id == artisan.id)
    ).all()

    months = last_n_months(12)
    month_set = set(months)
    buildings = sorted({extract_building(r.location) for r in requests})

    counts = {m: {b: 0 for b in buildings} for m in months}
    for r in requests:
        mkey = r.created_at.strftime("%Y-%m")
        if mkey in month_set:
            b = extract_building(r.location)
            counts[mkey][b] = counts[mkey].get(b, 0) + 1

    data = []
    for m in months:
        row = {"month": m, "month_label": month_label(m)}
        row.update(counts[m])
        data.append(row)

    return {
        "months": months,
        "buildings": buildings,
        "data": data,
    }


@router.get("/{artisan_id}", response_model=ArtisanRead)
def get_artisan(artisan_id: int, session: Session = Depends(get_session)):
    artisan = session.get(Artisan, artisan_id)
    if not artisan:
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")
    return _to_read(artisan, session)


@router.post("", response_model=ArtisanRead, status_code=status.HTTP_201_CREATED)
def create_artisan_profile(
    payload: ArtisanCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.artisan)),
):
    existing = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="عندك ملف حرفي مسجل مسبقاً")

    data = payload.model_dump()
    service_ids = data.pop("service_ids") or ([data["service_id"]] if data.get("service_id") else [])
    if not service_ids:
        raise HTTPException(status_code=400, detail="اختر خدمة وحدة على الأقل")
    data["specialty"] = data.get("specialty") or ""

    artisan = Artisan(user_id=user.id, **data)
    session.add(artisan)
    session.commit()
    session.refresh(artisan)

    if not set_artisan_services(session, artisan, service_ids):
        raise HTTPException(status_code=400, detail="الخدمات المختارة غير موجودة")
    session.commit()
    session.refresh(artisan)
    return _to_read(artisan, session)


def _apply_update(artisan: Artisan, user: User, payload: ArtisanUpdate, session: Session) -> Artisan:
    data = payload.model_dump(exclude_unset=True)
    name = data.pop("name", None)
    service_ids = data.pop("service_ids", None)

    if name is not None:
        if not name.strip():
            raise HTTPException(status_code=400, detail="الاسم ما يكون فارغ")
        owner = session.get(User, artisan.user_id)
        owner.name = name.strip()
        session.add(owner)

    if service_ids is not None:
        if not service_ids:
            raise HTTPException(status_code=400, detail="اختر خدمة وحدة على الأقل")
        set_artisan_services(session, artisan, service_ids)
        data.pop("service_id", None)
        data.pop("specialty", None)

    for field, value in data.items():
        setattr(artisan, field, value)

    session.add(artisan)
    session.commit()
    session.refresh(artisan)
    return artisan


@router.put("/me", response_model=ArtisanRead)
def update_my_profile(
    payload: ArtisanUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.artisan)),
):
    artisan = session.exec(select(Artisan).where(Artisan.user_id == user.id)).first()
    if not artisan:
        raise HTTPException(status_code=404, detail="ماكو ملف حرفي إلك بعد — سوي وحد أول")
    return _to_read(_apply_update(artisan, user, payload, session), session)


@router.put("/{artisan_id}", response_model=ArtisanRead)
def update_artisan_profile(
    artisan_id: int,
    payload: ArtisanUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    artisan = session.get(Artisan, artisan_id)
    if not artisan:
        raise HTTPException(status_code=404, detail="ما اكو حرفي بهذا المعرّف")

    if artisan.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="ما تكدرين تعدلين ملف حرفي ثاني")

    return _to_read(_apply_update(artisan, user, payload, session), session)
