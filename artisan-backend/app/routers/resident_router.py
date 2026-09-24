"""
لوحة الساكن (Resident Dashboard) — كل endpoints محمية بدور customer.

الصفحة الرئيسية بطلب واحد:
GET  /resident/dashboard                      -> كل محتوى الصفحة (ترحيب، ملف، إشعارات، أنواع الخدمات،
                                                 طلباتي الحالية، سجل الطلبات، متوسط تقييماتي، قيم خدمتك)

ملفي الشخصي:
GET  /resident/me                             -> الاسم، الهاتف، رقم الشقة، البناية/الطابق، الإيميل، واتساب
PUT  /resident/me                             -> تعديل (زر "تعديل")
POST /resident/me/avatar                      -> رفع صورة الملف الشخصي

اختر نوع الخدمة:
GET  /resident/service-categories             -> كل خدمة + عدد الحرفيين + أعلى 3 تقييماً
GET  /resident/services/{service_id}/artisans -> "عرض المزيد": كل حرفيي الخدمة

طلب خدمة جديدة (multipart/form-data):
POST /resident/requests                       -> نوع الخدمة، صور الضرر، اسمك، رقم الوحدة، الوقت المناسب،
                                                 الحرفي المفضل (للمشتركين فقط)
POST /resident/requests/{id}/images           -> إضافة صور لطلب موجود

طلباتي:
GET  /resident/requests/current               -> طلباتي الحالية (بانتظار القبول / مقبول / قيد التنفيذ)
GET  /resident/requests/history               -> سجل الطلبات (مكتمل، مع التقييم والسعر)
GET  /resident/requests/{id}                  -> تفاصيل الطلب (زر "عرض") + الصور + شريط التقدم
GET  /resident/requests/{id}/invoice          -> أيقونة التحميل بالسجل: فاتورة HTML قابلة للطباعة

التقييمات:
GET  /resident/ratings/summary                -> متوسط تقييماتي (4.7 / 5 بناءً على 9 تقييمات)
GET  /resident/reviews                        -> كل التقييمات اللي كتبها الساكن (صفحة "التقييمات")
GET  /resident/pending-review                 -> نافذة "قيم خدمتك" (الإرسال عبر POST /reviews الموجود)

الشكاوى:
POST /resident/complaints                     -> إرسال شكوى للإدارة
GET  /resident/complaints                     -> شكاواي وحالتها ورد الإدارة

الإشعارات بروتر منفصل (/notifications) لأن الحرفي يستخدمه هم.
"""

from datetime import datetime, timezone
from html import escape
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from app.auth import require_role
from app.database import get_session
from app.models import (
    Artisan,
    Complaint,
    Notification,
    NotificationType,
    RequestImage,
    RequestStatus,
    ResidentProfile,
    Review,
    Service,
    ServiceRequest,
    User,
    UserRole,
)
from app.notifications import notify
from app.progress import build_progress, status_label
from app.schemas import (
    ArtisanCard,
    ComplaintCreate,
    ComplaintRead,
    NotificationRead,
    PendingReview,
    RatingsSummary,
    ResidentDashboard,
    ResidentProfileRead,
    ResidentProfileUpdate,
    ResidentRequestDetail,
    ResidentRequestRow,
    ReviewDetailed,
    ServiceCategory,
)
from app.storage import save_image

router = APIRouter(prefix="/resident", tags=["Resident Dashboard"])

resident_only = require_role(UserRole.customer)

CURRENT_STATUSES = [RequestStatus.pending, RequestStatus.accepted, RequestStatus.in_progress]
MAX_IMAGES_PER_REQUEST = 5


# =====================================================================
# Helpers
# =====================================================================

def _get_or_create_profile(session: Session, user: User) -> ResidentProfile:
    """الساكن اللي سجل قبل هذي الميزة ما عنده profile — نسويله وحد فاضي أول مرة."""
    profile = session.exec(
        select(ResidentProfile).where(ResidentProfile.user_id == user.id)
    ).first()
    if not profile:
        profile = ResidentProfile(user_id=user.id)
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile


def _profile_read(user: User, profile: ResidentProfile) -> ResidentProfileRead:
    parts = [p for p in [profile.building, f"الطابق {profile.floor}" if profile.floor else None] if p]
    return ResidentProfileRead(
        user_id=user.id,
        name=user.name,
        email=user.email,
        phone=profile.phone,
        whatsapp=profile.whatsapp,
        apartment_number=profile.apartment_number,
        building=profile.building,
        floor=profile.floor,
        building_unit=" - ".join(parts) if parts else None,
        avatar=profile.avatar,
        is_subscriber=profile.is_subscriber,
    )


def _artisan_ratings(session: Session) -> Dict[int, Tuple[Optional[float], int]]:
    """artisan_id -> (متوسط التقييم, عدد التقييمات)"""
    totals: Dict[int, List[int]] = {}
    for rv in session.exec(select(Review)).all():
        totals.setdefault(rv.artisan_id, []).append(rv.rating)
    return {
        aid: (round(sum(r) / len(r), 1), len(r))
        for aid, r in totals.items()
    }


def _artisan_card(a: Artisan, session: Session, ratings) -> ArtisanCard:
    u = session.get(User, a.user_id)
    avg, count = ratings.get(a.id, (None, 0))
    return ArtisanCard(
        id=a.id,
        name=u.name if u else None,
        image=a.image,
        average_rating=avg,
        reviews_count=count,
    )


def _sorted_service_artisans(service_id: int, session: Session, ratings) -> List[Artisan]:
    artisans = session.exec(
        select(Artisan).where(Artisan.service_id == service_id, Artisan.verified == True)  # noqa: E712
    ).all()
    # الأعلى تقييماً أول؛ اللي ما عنده تقييم ينزل آخر القائمة
    return sorted(
        artisans,
        key=lambda a: (ratings.get(a.id, (None, 0))[0] or 0, ratings.get(a.id, (None, 0))[1]),
        reverse=True,
    )


def _service_categories(session: Session) -> List[ServiceCategory]:
    ratings = _artisan_ratings(session)
    results = []
    for s in session.exec(select(Service)).all():
        artisans = _sorted_service_artisans(s.id, session, ratings)
        results.append(
            ServiceCategory(
                service_id=s.id,
                name=s.name,
                icon=s.icon,
                artisans_count=len(artisans),
                top_artisans=[_artisan_card(a, session, ratings) for a in artisans[:3]],
            )
        )
    return results


def _my_reviews_by_request(session: Session, user: User) -> Dict[int, Review]:
    reviews = session.exec(select(Review).where(Review.customer_id == user.id)).all()
    return {r.request_id: r for r in reviews}


def _request_row(req: ServiceRequest, session: Session, my_reviews: Dict[int, Review],
                 cls=ResidentRequestRow, **extra):
    service = session.get(Service, req.service_id)
    artisan = session.get(Artisan, req.artisan_id) if req.artisan_id else None
    artisan_user = session.get(User, artisan.user_id) if artisan else None
    review = my_reviews.get(req.id)

    return cls(
        id=req.id,
        service_id=req.service_id,
        service_name=service.name if service else None,
        service_icon=service.icon if service else None,
        artisan_id=req.artisan_id,
        artisan_name=artisan_user.name if artisan_user else None,
        artisan_image=artisan.image if artisan else None,
        scheduled_at=req.scheduled_at,
        date=req.completed_at or req.scheduled_at or req.created_at,
        status=req.status,
        status_label=status_label(req.status),
        price=req.price,
        my_rating=review.rating if review else None,
        can_review=req.status == RequestStatus.completed and review is None,
        rejection_reason=req.rejection_reason,
        created_at=req.created_at,
        progress=[s.model_dump() for s in build_progress(req.status)],
        **extra,
    )


def _current_requests(session: Session, user: User, limit: Optional[int]) -> List[ResidentRequestRow]:
    query = (
        select(ServiceRequest)
        .where(ServiceRequest.customer_id == user.id, ServiceRequest.status.in_(CURRENT_STATUSES))
        .order_by(ServiceRequest.created_at.desc())
    )
    if limit:
        query = query.limit(limit)
    my_reviews = _my_reviews_by_request(session, user)
    return [_request_row(r, session, my_reviews) for r in session.exec(query).all()]


def _history(session: Session, user: User, limit: Optional[int], include_rejected: bool = False):
    statuses = [RequestStatus.completed] + ([RequestStatus.rejected] if include_rejected else [])
    reqs = session.exec(
        select(ServiceRequest).where(
            ServiceRequest.customer_id == user.id, ServiceRequest.status.in_(statuses)
        )
    ).all()
    reqs.sort(key=lambda r: r.completed_at or r.created_at, reverse=True)
    if limit:
        reqs = reqs[:limit]
    my_reviews = _my_reviews_by_request(session, user)
    return [_request_row(r, session, my_reviews) for r in reqs]


def _ratings_summary(session: Session, user: User) -> RatingsSummary:
    reviews = session.exec(select(Review).where(Review.customer_id == user.id)).all()
    distribution = {i: 0 for i in range(5, 0, -1)}
    for r in reviews:
        distribution[r.rating] = distribution.get(r.rating, 0) + 1
    return RatingsSummary(
        average=round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else None,
        count=len(reviews),
        distribution=distribution,
    )


def _pending_review(session: Session, user: User) -> Optional[PendingReview]:
    reviewed_ids = set(_my_reviews_by_request(session, user).keys())
    completed = session.exec(
        select(ServiceRequest).where(
            ServiceRequest.customer_id == user.id,
            ServiceRequest.status == RequestStatus.completed,
        )
    ).all()
    candidates = [r for r in completed if r.id not in reviewed_ids and r.artisan_id]
    if not candidates:
        return None
    req = max(candidates, key=lambda r: r.completed_at or r.created_at)
    artisan = session.get(Artisan, req.artisan_id)
    artisan_user = session.get(User, artisan.user_id) if artisan else None
    service = session.get(Service, req.service_id)
    return PendingReview(
        request_id=req.id,
        artisan_id=req.artisan_id,
        artisan_name=artisan_user.name if artisan_user else None,
        service_name=service.name if service else None,
        completed_at=req.completed_at,
    )


def _get_my_request(request_id: int, session: Session, user: User) -> ServiceRequest:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if req.customer_id != user.id:
        raise HTTPException(status_code=403, detail="هذا الطلب مو إلك")
    return req


def _auto_assign_artisan(service_id: int, session: Session) -> Optional[Artisan]:
    """
    لغير المشتركين (أو إذا المشترك ما اختار): نختار حرفي معتمد بنفس الخدمة —
    الأقل انشغالاً بطلبات مفتوحة، وعند التساوي الأعلى تقييماً.
    """
    ratings = _artisan_ratings(session)
    artisans = session.exec(
        select(Artisan).where(Artisan.service_id == service_id, Artisan.verified == True)  # noqa: E712
    ).all()
    if not artisans:
        return None

    def workload(a: Artisan) -> int:
        return len(session.exec(
            select(ServiceRequest).where(
                ServiceRequest.artisan_id == a.id,
                ServiceRequest.status.in_([RequestStatus.pending, RequestStatus.accepted,
                                           RequestStatus.in_progress]),
            )
        ).all())

    return min(artisans, key=lambda a: (workload(a), -(ratings.get(a.id, (0, 0))[0] or 0)))


def _complaint_read(c: Complaint, session: Session) -> ComplaintRead:
    u = session.get(User, c.customer_id)
    return ComplaintRead(
        id=c.id,
        customer_id=c.customer_id,
        customer_name=u.name if u else None,
        request_id=c.request_id,
        subject=c.subject,
        message=c.message,
        status=c.status,
        admin_reply=c.admin_reply,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


# =====================================================================
# الصفحة الرئيسية
# =====================================================================

@router.get("/dashboard", response_model=ResidentDashboard)
def get_dashboard(
    notifications_limit: int = Query(3, ge=1, le=20),
    requests_limit: int = Query(3, ge=1, le=20),
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    profile = _get_or_create_profile(session, user)
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(notifications_limit)
    ).all()
    unread = len(session.exec(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
    ).all())

    return ResidentDashboard(
        greeting_name=user.name,
        profile=_profile_read(user, profile),
        unread_notifications_count=unread,
        notifications=[NotificationRead.model_validate(n) for n in notifications],
        service_categories=_service_categories(session),
        current_requests=_current_requests(session, user, requests_limit),
        history=_history(session, user, requests_limit),
        ratings_summary=_ratings_summary(session, user),
        pending_review=_pending_review(session, user),
    )


# =====================================================================
# ملفي الشخصي
# =====================================================================

@router.get("/me", response_model=ResidentProfileRead)
def get_my_profile(session: Session = Depends(get_session), user: User = Depends(resident_only)):
    return _profile_read(user, _get_or_create_profile(session, user))


@router.put("/me", response_model=ResidentProfileRead)
def update_my_profile(
    payload: ResidentProfileUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    profile = _get_or_create_profile(session, user)
    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] != user.email:
        taken = session.exec(select(User).where(User.email == data["email"])).first()
        if taken:
            raise HTTPException(status_code=400, detail="هذا الإيميل مسجل مسبقاً")
        user.email = data.pop("email")
    else:
        data.pop("email", None)

    if "name" in data:
        name = (data.pop("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="الاسم ما يكون فارغ")
        user.name = name

    for field, value in data.items():
        setattr(profile, field, value)

    session.add(user)
    session.add(profile)
    session.commit()
    session.refresh(user)
    session.refresh(profile)
    return _profile_read(user, profile)


@router.post("/me/avatar", response_model=ResidentProfileRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    profile = _get_or_create_profile(session, user)
    profile.avatar = await save_image(file, "avatars")
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _profile_read(user, profile)


# =====================================================================
# اختر نوع الخدمة
# =====================================================================

@router.get("/service-categories", response_model=List[ServiceCategory])
def get_service_categories(session: Session = Depends(get_session), _: User = Depends(resident_only)):
    return _service_categories(session)


@router.get("/services/{service_id}/artisans", response_model=List[ArtisanCard])
def get_service_artisans(
    service_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(resident_only),
):
    if not session.get(Service, service_id):
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")
    ratings = _artisan_ratings(session)
    return [_artisan_card(a, session, ratings)
            for a in _sorted_service_artisans(service_id, session, ratings)]


# =====================================================================
# طلب خدمة جديدة
# =====================================================================

@router.post("/requests", response_model=ResidentRequestDetail, status_code=status.HTTP_201_CREATED)
async def create_resident_request(
    service_id: int = Form(...),
    contact_name: Optional[str] = Form(None),
    unit_number: Optional[str] = Form(None),
    scheduled_at: Optional[datetime] = Form(None),
    description: Optional[str] = Form(None),
    preferred_artisan_id: Optional[int] = Form(None),
    building: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="نوع الخدمة غير موجود")

    images = [f for f in (images or []) if f and f.filename]
    if len(images) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"الحد الأقصى {MAX_IMAGES_PER_REQUEST} صور")

    if scheduled_at and scheduled_at.tzinfo is not None:
        # نخزن كل الأوقات naive UTC (نفس created_at)
        scheduled_at = scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    if scheduled_at and scheduled_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="الوقت المناسب لازم يكون بالمستقبل")

    profile = _get_or_create_profile(session, user)

    # اختيار الحرفي — للمشتركين فقط
    artisan: Optional[Artisan] = None
    if preferred_artisan_id is not None:
        if not profile.is_subscriber:
            raise HTTPException(status_code=403, detail="اختيار الحرفي متاح للمشتركين فقط")
        artisan = session.get(Artisan, preferred_artisan_id)
        if not artisan or not artisan.verified:
            raise HTTPException(status_code=404, detail="الحرفي غير موجود أو غير معتمد")
        if artisan.service_id != service_id:
            raise HTTPException(status_code=400, detail="هذا الحرفي ما يقدم نوع الخدمة المختار")
    else:
        artisan = _auto_assign_artisan(service_id, session)

    unit = unit_number or profile.apartment_number
    location_parts = [building or profile.building, unit]
    req = ServiceRequest(
        customer_id=user.id,
        artisan_id=artisan.id if artisan else None,
        service_id=service_id,
        description=description,
        contact_name=contact_name or user.name,
        unit_number=unit,
        # نفس صيغة "بناية - شقة" اللي تعتمد عليها إحصائيات الحرفي حسب البناية
        location=" - ".join(p for p in location_parts if p) or None,
        scheduled_at=scheduled_at,
    )
    session.add(req)
    session.commit()
    session.refresh(req)

    for f in images:
        url = await save_image(f, f"requests/{req.id}")
        session.add(RequestImage(request_id=req.id, url=url))

    if artisan:
        artisan_user = session.get(User, artisan.user_id)
        notify(session, user.id, NotificationType.request_received,
               f"تم استلام طلبك رقم #{req.id}",
               f"تم تحويله للحرفي {artisan_user.name if artisan_user else ''} — بانتظار القبول", req.id)
        notify(session, artisan.user_id, NotificationType.new_request,
               f"وصلك طلب جديد رقم #{req.id}", f"{service.name} — {req.location or ''}", req.id)
    else:
        notify(session, user.id, NotificationType.request_received,
               f"تم استلام طلبك رقم #{req.id}", "جاري البحث عن حرفي مناسب", req.id)
    session.commit()

    return get_request_detail(req.id, session, user)


@router.post("/requests/{request_id}/images", response_model=ResidentRequestDetail)
async def add_request_images(
    request_id: int,
    images: List[UploadFile] = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    req = _get_my_request(request_id, session, user)
    if req.status in (RequestStatus.completed, RequestStatus.rejected):
        raise HTTPException(status_code=400, detail="ما تكدر تضيف صور لطلب منتهي")

    existing = len(session.exec(select(RequestImage).where(RequestImage.request_id == req.id)).all())
    if existing + len(images) > MAX_IMAGES_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"الحد الأقصى {MAX_IMAGES_PER_REQUEST} صور للطلب")

    for f in images:
        session.add(RequestImage(request_id=req.id, url=await save_image(f, f"requests/{req.id}")))
    session.commit()
    return get_request_detail(req.id, session, user)


# =====================================================================
# طلباتي الحالية + سجل الطلبات
# (current/history لازم قبل /{request_id} بالترتيب)
# =====================================================================

@router.get("/requests/current", response_model=List[ResidentRequestRow])
def get_current_requests(
    limit: Optional[int] = Query(None, ge=1, le=100),
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    return _current_requests(session, user, limit)


@router.get("/requests/history", response_model=List[ResidentRequestRow])
def get_request_history(
    limit: Optional[int] = Query(None, ge=1, le=100),
    include_rejected: bool = False,
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    return _history(session, user, limit, include_rejected)


@router.get("/requests/{request_id}", response_model=ResidentRequestDetail)
def get_request_detail(
    request_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    req = _get_my_request(request_id, session, user)
    my_reviews = _my_reviews_by_request(session, user)
    images = session.exec(select(RequestImage).where(RequestImage.request_id == req.id)).all()
    review = my_reviews.get(req.id)
    return _request_row(
        req, session, my_reviews, cls=ResidentRequestDetail,
        description=req.description,
        location=req.location,
        contact_name=req.contact_name,
        unit_number=req.unit_number,
        images=[i.url for i in images],
        my_review_comment=review.comment if review else None,
    )


@router.get("/requests/{request_id}/invoice", response_class=HTMLResponse)
def download_invoice(
    request_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    """فاتورة HTML (تنفتح بالمتصفح وتنطبع/تنحفظ PDF) — بدون مكتبات إضافية."""
    req = _get_my_request(request_id, session, user)
    if req.status != RequestStatus.completed:
        raise HTTPException(status_code=400, detail="الفاتورة متوفرة بس للطلبات المكتملة")

    row = _request_row(req, session, _my_reviews_by_request(session, user))
    profile = _get_or_create_profile(session, user)
    price = f"{req.price:,} د.ع" if req.price is not None else "—"
    date = (row.date or req.created_at).strftime("%d/%m/%Y")

    def e(v):
        return escape(str(v)) if v is not None else "—"

    html = f"""<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة #{req.id}</title>
<style>
 body{{font-family:Tahoma,Arial,sans-serif;max-width:640px;margin:32px auto;color:#1f2937}}
 h1{{color:#1d4ed8;font-size:22px}} table{{width:100%;border-collapse:collapse;margin-top:16px}}
 td{{padding:10px;border-bottom:1px solid #e5e7eb}} td:first-child{{color:#6b7280;width:40%}}
 .total{{font-size:20px;font-weight:bold}}
</style></head><body>
<h1>فاتورة خدمة — طلب رقم #{req.id}</h1>
<table>
 <tr><td>الساكن</td><td>{e(user.name)}</td></tr>
 <tr><td>رقم الوحدة</td><td>{e(req.unit_number or profile.apartment_number)}</td></tr>
 <tr><td>الخدمة</td><td>{e(row.service_name)}</td></tr>
 <tr><td>الحرفي</td><td>{e(row.artisan_name)}</td></tr>
 <tr><td>التاريخ</td><td>{date}</td></tr>
 <tr><td>الحالة</td><td>{e(row.status_label)}</td></tr>
 <tr><td>التقييم</td><td>{e(row.my_rating)}</td></tr>
 <tr><td>السعر</td><td class="total">{price}</td></tr>
</table></body></html>"""

    return HTMLResponse(
        content=html,
        headers={"Content-Disposition": f'attachment; filename="invoice-{req.id}.html"'},
    )


# =====================================================================
# التقييمات
# =====================================================================

@router.get("/ratings/summary", response_model=RatingsSummary)
def get_ratings_summary(session: Session = Depends(get_session), user: User = Depends(resident_only)):
    return _ratings_summary(session, user)


@router.get("/reviews", response_model=List[ReviewDetailed])
def get_my_reviews(session: Session = Depends(get_session), user: User = Depends(resident_only)):
    reviews = session.exec(
        select(Review).where(Review.customer_id == user.id).order_by(Review.created_at.desc())
    ).all()
    results = []
    for rv in reviews:
        artisan = session.get(Artisan, rv.artisan_id)
        artisan_user = session.get(User, artisan.user_id) if artisan else None
        req = session.get(ServiceRequest, rv.request_id)
        service = session.get(Service, req.service_id) if req else None
        results.append(ReviewDetailed(
            id=rv.id, rating=rv.rating, comment=rv.comment, created_at=rv.created_at,
            customer_name=user.name,
            artisan_name=artisan_user.name if artisan_user else None,
            service_name=service.name if service else None,
        ))
    return results


@router.get("/pending-review", response_model=Optional[PendingReview])
def get_pending_review(session: Session = Depends(get_session), user: User = Depends(resident_only)):
    """يرجع null إذا ماكو طلب يحتاج تقييم — الفرونت يخفي النافذة."""
    return _pending_review(session, user)


# =====================================================================
# الشكاوى
# =====================================================================

@router.post("/complaints", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    session: Session = Depends(get_session),
    user: User = Depends(resident_only),
):
    if not payload.subject.strip() or not payload.message.strip():
        raise HTTPException(status_code=400, detail="العنوان ونص الشكوى مطلوبين")
    if payload.request_id is not None:
        _get_my_request(payload.request_id, session, user)

    complaint = Complaint(
        customer_id=user.id,
        request_id=payload.request_id,
        subject=payload.subject.strip(),
        message=payload.message.strip(),
    )
    session.add(complaint)
    session.commit()
    session.refresh(complaint)

    for admin in session.exec(select(User).where(User.role == UserRole.admin)).all():
        notify(session, admin.id, NotificationType.general,
               f"شكوى جديدة #{complaint.id} من {user.name}", complaint.subject)
    session.commit()
    return _complaint_read(complaint, session)


@router.get("/complaints", response_model=List[ComplaintRead])
def get_my_complaints(session: Session = Depends(get_session), user: User = Depends(resident_only)):
    complaints = session.exec(
        select(Complaint).where(Complaint.customer_id == user.id).order_by(Complaint.created_at.desc())
    ).all()
    return [_complaint_read(c, session) for c in complaints]
