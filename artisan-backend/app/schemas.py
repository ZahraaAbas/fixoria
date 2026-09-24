"""
Schemas — شكل الـ input/output للـ API، منفصلة عن موديلات الجدول
(هذا أفضل practice: ما نرجع password_hash مثلاً بالـ response).
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr

from app.models import UserRole


# ---------- Auth ----------

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer
    # حقول اختيارية للساكن — تنحفظ بـ ResidentProfile مباشرة وقت التسجيل
    phone: Optional[str] = None
    building: Optional[str] = None
    apartment_number: Optional[str] = None
    floor: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Artisan ----------

class ArtisanCreate(BaseModel):
    phone: str
    service_id: Optional[int] = None
    specialty: str
    description: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None


class ArtisanUpdate(BaseModel):
    phone: Optional[str] = None
    service_id: Optional[int] = None
    specialty: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None


class ArtisanRead(BaseModel):
    id: int
    user_id: int
    service_id: Optional[int] = None
    phone: str
    specialty: str
    description: Optional[str] = None
    location: Optional[str] = None
    verified: bool
    image: Optional[str] = None
    name: Optional[str] = None  # نعبيها يدوياً من User.name بالـ endpoint
    email: Optional[str] = None  # نعبيها يدوياً من User.email بالـ endpoint
    service_name: Optional[str] = None
    average_rating: Optional[float] = None
    reviews_count: int = 0

    class Config:
        from_attributes = True


# ---------- Service ----------

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


class ServiceRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- ServiceRequest ----------

class RequestCreate(BaseModel):
    artisan_id: int
    service_id: int
    description: Optional[str] = None
    location: Optional[str] = None


class RequestStatusUpdate(BaseModel):
    status: str  # accepted / rejected / in_progress / completed
    rejection_reason: Optional[str] = None  # يوصل للساكن بإشعار الرفض
    price: Optional[int] = None              # يحدده الحرفي عند completed (دينار عراقي)
    scheduled_at: Optional[datetime] = None  # يكدر الحرفي يثبت/يعدل الموعد عند القبول


class RequestRead(BaseModel):
    id: int
    customer_id: int
    artisan_id: Optional[int] = None
    service_id: int
    description: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    unit_number: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    price: Optional[int] = None
    rejection_reason: Optional[str] = None
    status: str
    created_at: datetime
    progress: list = []  # ProgressStep list — نعبيها بالـ endpoint (تفادياً لدورة استيراد)
    service_name: Optional[str] = None
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True


class RequestWithProgress(BaseModel):
    """نسخة موسّعة لعرض الأدمن — بأسماء بدل المعرّفات فقط، لمراقبة كل عملية بدقة."""

    id: int
    customer_name: Optional[str] = None
    artisan_name: Optional[str] = None
    service_name: Optional[str] = None
    location: Optional[str] = None
    status: str
    created_at: datetime
    progress: list = []


# ---------- Review ----------

class ReviewCreate(BaseModel):
    request_id: int
    rating: int
    comment: Optional[str] = None


class ReviewRead(BaseModel):
    id: int
    customer_id: int
    artisan_id: int
    request_id: int
    rating: int
    comment: Optional[str] = None

    class Config:
        from_attributes = True


class ReviewDetailed(BaseModel):
    """تقييم مع أسماء العميل/الحرفي/الخدمة — نعبيها يدوياً بالـ endpoint، تستخدم بخانة الـ Reviews بالداشبورد."""

    id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    customer_name: Optional[str] = None
    artisan_name: Optional[str] = None
    service_name: Optional[str] = None


# ---------- Admin Dashboard ----------

class ArtisanCountStats(BaseModel):
    total: int
    verified: int
    pending: int  # بانتظار الاعتماد


class RequestCountStats(BaseModel):
    pending: int
    accepted: int
    rejected: int
    in_progress: int
    completed: int
    total: int


class AdminOverviewStats(BaseModel):
    artisans: ArtisanCountStats
    requests: RequestCountStats
    customers_count: int
    overall_average_rating: Optional[float] = None
    total_reviews: int


class ServiceStat(BaseModel):
    """تراكنك لكل نوع خدمة صيانة (كهرباء، سباكة...) — يبين إذا الأداء تحت المتوسط ولِيش."""

    service_id: int
    service_name: str
    total_requests: int
    completed_requests: int
    rejected_requests: int
    reviews_count: int
    average_rating: Optional[float] = None
    below_average: bool = False
    reason: Optional[str] = None  # يتعبى بس إذا below_average = True


class ArtisanActivityStat(BaseModel):
    """عدد الطلبات لكل حرفي اليوم/الشهر/السنة — لعمود الأدمن (Bar Chart)."""

    artisan_id: int
    artisan_name: Optional[str] = None
    specialty: str
    today: int
    this_month: int
    this_year: int


# ---------- Resident Dashboard (لوحة الساكن) ----------

class ResidentProfileRead(BaseModel):
    """خانة (ملفي الشخصي) + الكارت العلوي بالسايدبار."""

    user_id: int
    name: str
    email: str
    role_label: str = "ساكن"
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    apartment_number: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    building_unit: Optional[str] = None  # جاهز للعرض: "البناية B - الطابق 2"
    avatar: Optional[str] = None
    is_subscriber: bool = False


class ResidentProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    apartment_number: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None


class ArtisanCard(BaseModel):
    """حرفي داخل كارت نوع الخدمة (صورة + اسم + تقييم)."""

    id: int
    name: Optional[str] = None
    image: Optional[str] = None
    average_rating: Optional[float] = None
    reviews_count: int = 0


class ServiceCategory(BaseModel):
    """كارت (اختر نوع الخدمة التي تحتاجها)."""

    service_id: int
    name: str
    icon: Optional[str] = None
    artisans_count: int
    top_artisans: List[ArtisanCard] = []


class ResidentRequestRow(BaseModel):
    """صف بجدول (طلباتي الحالية) أو (سجل الطلبات)."""

    id: int
    service_id: int
    service_name: Optional[str] = None
    service_icon: Optional[str] = None
    artisan_id: Optional[int] = None
    artisan_name: Optional[str] = None
    artisan_image: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    date: Optional[datetime] = None  # للسجل: تاريخ الإكمال (أو الموعد/الإنشاء)
    status: str
    status_label: str
    price: Optional[int] = None
    currency: str = "IQD"
    my_rating: Optional[int] = None
    can_review: bool = False
    rejection_reason: Optional[str] = None
    created_at: datetime
    progress: list = []


class ResidentRequestDetail(ResidentRequestRow):
    """تفاصيل الطلب (زر عرض)."""

    description: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None
    unit_number: Optional[str] = None
    images: List[str] = []
    my_review_comment: Optional[str] = None


class NotificationRead(BaseModel):
    id: int
    type: str
    title: str
    body: Optional[str] = None
    request_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RatingsSummary(BaseModel):
    """خانة (متوسط تقييماتي) — معدل التقييمات اللي عطاها الساكن."""

    average: Optional[float] = None
    count: int = 0
    distribution: Dict[int, int] = {}  # {5: 6, 4: 2, ...}


class PendingReview(BaseModel):
    """نافذة (قيم خدمتك): آخر طلب مكتمل ما انقيّم بعد."""

    request_id: int
    artisan_id: Optional[int] = None
    artisan_name: Optional[str] = None
    service_name: Optional[str] = None
    completed_at: Optional[datetime] = None


class ComplaintCreate(BaseModel):
    subject: str
    message: str
    request_id: Optional[int] = None


class ComplaintRead(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    request_id: Optional[int] = None
    subject: str
    message: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ComplaintAdminUpdate(BaseModel):
    status: Optional[str] = None  # open / in_review / resolved
    admin_reply: Optional[str] = None


class ResidentDashboard(BaseModel):
    """كل محتوى الصفحة الرئيسية للساكن بطلب واحد."""

    greeting_name: str
    profile: ResidentProfileRead
    unread_notifications_count: int
    notifications: List[NotificationRead]
    service_categories: List[ServiceCategory]
    current_requests: List[ResidentRequestRow]
    history: List[ResidentRequestRow]
    ratings_summary: RatingsSummary
    pending_review: Optional[PendingReview] = None
