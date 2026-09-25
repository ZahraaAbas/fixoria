"""
Reviews endpoints:
POST /reviews                    -> Create review after completed request (customer)
GET  /artisans/{id}/reviews      -> Artisan reviews
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Artisan, NotificationType, Review, ServiceRequest, RequestStatus, User, UserRole
from app.notifications import notify
from app.schemas import ReviewCreate, ReviewRead
from app.auth import get_current_user

router = APIRouter(tags=["Reviews"])


@router.post("/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.role != UserRole.customer:
        raise HTTPException(status_code=403, detail="بس الزبون يكدر يكتب تقييم")

    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="التقييم لازم يكون بين 1 و 5")

    req = session.get(ServiceRequest, payload.request_id)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if req.customer_id != user.id:
        raise HTTPException(status_code=403, detail="هذا الطلب مو إلك")
    if req.status != RequestStatus.completed:
        raise HTTPException(status_code=400, detail="تكدرين تقيّمين بس بعد إكمال الطلب")

    existing = session.exec(
        select(Review).where(Review.request_id == req.id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="هذا الطلب مقيّم مسبقاً")

    review = Review(
        customer_id=user.id,
        artisan_id=req.artisan_id,
        request_id=req.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    session.add(review)
    artisan = session.get(Artisan, req.artisan_id)
    if artisan:
        notify(session, artisan.user_id, NotificationType.general,
               f"تقييم جديد {payload.rating}/5 على الطلب #{req.id}", payload.comment, req.id)
    session.commit()
    session.refresh(review)
    return review


@router.get("/artisans/{artisan_id}/reviews", response_model=List[ReviewRead])
def get_artisan_reviews(artisan_id: int, session: Session = Depends(get_session)):
    # التقييمات المخفية من الإدارة ما تظهر للعامة
    return session.exec(
        select(Review).where(Review.artisan_id == artisan_id, Review.is_hidden == False)  # noqa: E712
    ).all()
