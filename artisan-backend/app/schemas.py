"""
Schemas — شكل الـ input/output للـ API، منفصلة عن موديلات الجدول
(هذا أفضل practice: ما نرجع password_hash مثلاً بالـ response).
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole


# ---------- Auth ----------

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.customer
    compound_id: Optional[int] = None  # مطلوب للساكن: المجمع اللي يسكن بيه (مشرفه يوافق)
    # حقول اختيارية للساكن — تنحفظ بـ ResidentProfile مباشرة وقت التسجيل
    phone: Optional[str] = None
    building: Optional[str] = None
    apartment_number: Optional[str] = None
    floor: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)  # نفس الحد الأدنى بالفرونت


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
    service_ids: List[int] = []  # الحرفي يكدر يختار أكثر من خدمة
    specialty: Optional[str] = None  # إذا فارغ ينبني من أسماء الخدمات
    description: Optional[str] = None
    location: Optional[str] = None
    image: Optional[str] = None


class ArtisanUpdate(BaseModel):
    name: Optional[str] = None  # يحدّث User.name (بس بـ PUT /artisans/me)
    phone: Optional[str] = None
    service_id: Optional[int] = None
    service_ids: Optional[List[int]] = None
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
    rejected: bool = False
    status: str = "pending"  # approved / pending / rejected
    image: Optional[str] = None
    name: Optional[str] = None  # نعبيها يدوياً من User.name بالـ endpoint
    email: Optional[str] = None  # نعبيها يدوياً من User.email بالـ endpoint
    service_name: Optional[str] = None
    service_ids: List[int] = []
    service_names: List[str] = []
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


class RequestReviewInfo(BaseModel):
    id: int
    rating: int
    comment: Optional[str] = None
    is_hidden: bool = False
    created_at: datetime


class RequestRead(BaseModel):
    id: int
    customer_id: int
    artisan_id: Optional[int] = None
    service_id: int
    compound_id: Optional[int] = None
    compound_name: Optional[str] = None  # للتحليلات: الشركة تشتغل بأكثر من مجمع
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    building: Optional[str] = None
    contact_name: Optional[str] = None
    unit_number: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    price: Optional[int] = None
    payment_method: Optional[str] = None   # cash / card_demo (تجريبي)
    payment_status: str = "unpaid"         # unpaid / paid
    paid_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    status: str
    created_at: datetime
    progress: list = []  # ProgressStep list — نعبيها بالـ endpoint (تفادياً لدورة استيراد)
    service_name: Optional[str] = None
    customer_name: Optional[str] = None
    artisan_name: Optional[str] = None
    completed_at: Optional[datetime] = None
    review: Optional[RequestReviewInfo] = None
    images: List[str] = []  # روابط صور الضرر (/uploads/...) — نعبيها بالـ endpoint
    audio: Optional[str] = None  # رابط الوصف الصوتي — نعبيه بالـ endpoint

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
    request_id: Optional[int] = None
    request_title: Optional[str] = None
    is_hidden: bool = False


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
    cancelled: int = 0
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
    membership_status: str = "pending"   # pending / approved / rejected (موافقة مشرف المجمع)
    compound_id: Optional[int] = None
    compound_name: Optional[str] = None
    compound_active: bool = False


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
    customer_id: Optional[int] = None
    title: Optional[str] = None
    building: Optional[str] = None
    unit_number: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    date: Optional[datetime] = None  # للسجل: تاريخ الإكمال (أو الموعد/الإنشاء)
    status: str
    status_label: str
    price: Optional[int] = None
    currency: str = "IQD"
    payment_method: Optional[str] = None
    payment_status: str = "unpaid"
    paid_at: Optional[datetime] = None
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
    audio: Optional[str] = None  # رابط الوصف الصوتي (/uploads/...)
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


# ---------- AI Service Assistant (المساعد الذكي لطلب الخدمة) ----------
# منقولة كما هي من فرع BackendChatbot

class AIChatTurn(BaseModel):
    """رسالة سابقة من المحادثة (حتى يفهم المساعد الردود المكملة مثل: \"باجر الساعة 5\")."""

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=1000)


class AIServiceRequestInput(BaseModel):
    message: str = Field(min_length=2, max_length=1000)
    history: List[AIChatTurn] = Field(default_factory=list, max_length=10)


class AIRequestDraft(BaseModel):
    """مسودة الطلب بعد تحقق الباكند — ما تنحفظ بقاعدة البيانات، الساكن يراجعها ويؤكدها أول."""

    service_id: int
    service_name: str
    problem: str
    priority: str  # normal / urgent
    preferred_time: Optional[str] = None  # ISO محلي (بغداد) مثل 2026-10-01T17:00
    additional_details: List[str] = []
    confidence: float


class AIServiceRequestOutput(BaseModel):
    status: str  # ready = المسودة جاهزة للتأكيد | needs_clarification = نحتاج توضيح من الساكن
    assistant_message: str
    request: Optional[AIRequestDraft] = None


# ---------- لوحة مالك المنصة (تعدد المجمعات) ----------

class StaffCreate(BaseModel):
    """حساب مشرف مجمع أو مدير شركة — المالك يحدد كلمة سر أولية، وصاحبها يغيرها من "حسابي"."""

    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class StaffRead(BaseModel):
    id: int
    name: str
    email: str


class CompoundCreate(BaseModel):
    name: str = Field(min_length=1)
    address: Optional[str] = None
    phone: Optional[str] = None


class CompoundUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class CompoundRead(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    residents: int = 0
    pending_residents: int = 0
    requests: int = 0
    admins: List[StaffRead] = []
    companies: List[str] = []   # أسماء الشركات المتفق وياها (اتفاقيات فعالة)


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1)
    phone: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyRead(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    artisans: int = 0
    managers: List[StaffRead] = []
    compounds: List[str] = []   # أسماء المجمعات المتفق وياها (اتفاقيات فعالة)


class AgreementCreate(BaseModel):
    compound_id: int
    company_id: int
    service_ids: List[int] = Field(min_length=1)


class AgreementUpdate(BaseModel):
    service_ids: Optional[List[int]] = Field(default=None, min_length=1)
    is_active: Optional[bool] = None


class AgreementRead(BaseModel):
    id: int
    compound_id: int
    compound_name: str
    company_id: int
    company_name: str
    service_ids: List[int]
    is_active: bool
    created_at: datetime


class OwnerOverview(BaseModel):
    compounds: int
    active_compounds: int
    companies: int
    active_agreements: int
    residents: int
    pending_residents: int
    artisans: int
    requests: int
    open_requests: int


# ---------- سكان المجمع (موافقة مشرف المجمع) ----------

class ResidentMembershipRead(BaseModel):
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    apartment_number: Optional[str] = None
    membership_status: str  # pending / approved / rejected


class MembershipUpdate(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")


class PaymentChoice(BaseModel):
    method: str = Field(pattern="^(cash|card_demo)$")


class PaymentsSummary(BaseModel):
    """ملخص شهري بالدينار (الطلبات المكتملة بالشهر)."""
    month: str                 # YYYY-MM
    completed: int = 0
    total: int = 0
    paid: int = 0
    unpaid: int = 0
    cash: int = 0
    card_demo: int = 0
    unpriced: int = 0          # مكتملة بدون سعر


class CompoundOption(BaseModel):
    """المجمعات المفعّلة بقائمة التسجيل (عامة)."""
    id: int
    name: str


# ---------- لوحة مدير شركة الصيانة ----------

class CompanyArtisanCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)
    phone: str = Field(min_length=1)
    service_ids: List[int] = Field(min_length=1)
    description: Optional[str] = None


class CompanyArtisanUpdate(BaseModel):
    phone: Optional[str] = None
    description: Optional[str] = None
    service_ids: Optional[List[int]] = Field(default=None, min_length=1)
    is_active: Optional[bool] = None


class CompanyCompoundRead(BaseModel):
    compound_id: int
    compound_name: str
    compound_active: bool
    service_ids: List[int]
    service_names: List[str]


class CompanyOverview(BaseModel):
    company_name: str
    company_active: bool
    artisans: int
    active_artisans: int
    compounds: List[CompanyCompoundRead]
    open_requests: int      # مفتوحة (بدون حرفي) بمجمعات الشركة
    active_requests: int    # مقبولة أو قيد التنفيذ عند حرفيي الشركة
    completed_requests: int

