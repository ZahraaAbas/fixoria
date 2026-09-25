"""
دوال مشتركة بين الروترات: خدمات الحرفي، التقييمات الظاهرة، وتحويل الموديلات لاستجابات.
"""

from typing import Dict, Iterable, List, Optional, Tuple

from sqlmodel import Session, select

from app.models import (
    Artisan,
    ArtisanServiceLink,
    Review,
    Service,
    ServiceRequest,
    User,
)
from app.progress import build_progress
from app.schemas import ArtisanRead, RequestRead, RequestReviewInfo


# ---------- خدمات الحرفي ----------

def artisan_service_ids(session: Session, artisan: Artisan) -> List[int]:
    links = session.exec(
        select(ArtisanServiceLink).where(ArtisanServiceLink.artisan_id == artisan.id)
    ).all()
    ids = [link.service_id for link in links]
    # بيانات قديمة: الحرفي عنده service_id بدون روابط
    if not ids and artisan.service_id:
        ids = [artisan.service_id]
    return ids


def set_artisan_services(session: Session, artisan: Artisan, service_ids: Iterable[int]) -> List[Service]:
    """يستبدل خدمات الحرفي؛ أول خدمة تصير service_id الأساسية. يرجّع الخدمات الصحيحة."""
    unique_ids = list(dict.fromkeys(int(i) for i in service_ids))
    services = [s for s in (session.get(Service, i) for i in unique_ids) if s]

    for link in session.exec(
        select(ArtisanServiceLink).where(ArtisanServiceLink.artisan_id == artisan.id)
    ).all():
        session.delete(link)
    for s in services:
        session.add(ArtisanServiceLink(artisan_id=artisan.id, service_id=s.id))

    artisan.service_id = services[0].id if services else None
    if services:
        artisan.specialty = "، ".join(s.name for s in services)
    session.add(artisan)
    return services


def artisans_for_service(session: Session, service_id: int, verified_only: bool = True) -> List[Artisan]:
    links = session.exec(
        select(ArtisanServiceLink).where(ArtisanServiceLink.service_id == service_id)
    ).all()
    ids = {link.artisan_id for link in links}
    legacy = session.exec(select(Artisan).where(Artisan.service_id == service_id)).all()
    ids.update(a.id for a in legacy)

    artisans = [session.get(Artisan, i) for i in ids]
    return [a for a in artisans if a and (a.verified or not verified_only)]


# ---------- التقييمات (الظاهرة فقط) ----------

def visible_reviews_query():
    return select(Review).where(Review.is_hidden == False)  # noqa: E712


def artisan_rating(session: Session, artisan_id: int) -> Tuple[Optional[float], int]:
    ratings = [
        r.rating
        for r in session.exec(visible_reviews_query().where(Review.artisan_id == artisan_id)).all()
    ]
    return (round(sum(ratings) / len(ratings), 1) if ratings else None, len(ratings))


def all_artisan_ratings(session: Session) -> Dict[int, Tuple[Optional[float], int]]:
    totals: Dict[int, List[int]] = {}
    for rv in session.exec(visible_reviews_query()).all():
        totals.setdefault(rv.artisan_id, []).append(rv.rating)
    return {aid: (round(sum(r) / len(r), 1), len(r)) for aid, r in totals.items()}


# ---------- تحويلات ----------

def artisan_status(artisan: Artisan) -> str:
    if artisan.verified:
        return "approved"
    return "rejected" if artisan.rejected else "pending"


def artisan_to_read(artisan: Artisan, session: Session) -> ArtisanRead:
    data = ArtisanRead.model_validate(artisan, from_attributes=True)
    user = session.get(User, artisan.user_id)
    data.name = user.name if user else None
    data.email = user.email if user else None

    ids = artisan_service_ids(session, artisan)
    services = [s for s in (session.get(Service, i) for i in ids) if s]
    data.service_ids = [s.id for s in services]
    data.service_names = [s.name for s in services]
    data.service_name = services[0].name if services else None

    data.average_rating, data.reviews_count = artisan_rating(session, artisan.id)
    data.status = artisan_status(artisan)
    return data


def request_to_read(req: ServiceRequest, session: Session) -> RequestRead:
    data = RequestRead.model_validate(req, from_attributes=True)
    data.progress = [s.model_dump() for s in build_progress(req.status)]

    service = session.get(Service, req.service_id)
    customer = session.get(User, req.customer_id)
    artisan = session.get(Artisan, req.artisan_id) if req.artisan_id else None
    artisan_user = session.get(User, artisan.user_id) if artisan else None
    review = session.exec(select(Review).where(Review.request_id == req.id)).first()

    data.service_name = service.name if service else None
    data.customer_name = customer.name if customer else None
    data.artisan_name = artisan_user.name if artisan_user else None
    data.review = (
        RequestReviewInfo(id=review.id, rating=review.rating, comment=review.comment,
                          is_hidden=review.is_hidden, created_at=review.created_at)
        if review else None
    )
    return data
