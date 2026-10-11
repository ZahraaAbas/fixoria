"""
موديلات قاعدة البيانات — حسب القسم 3 بخطة المشروع:
User, Artisan, Service, ServiceRequest, Review

إضافات لوحة الساكن:
ResidentProfile (بيانات الشقة والتواصل), RequestImage (صور الضرر),
Notification (الإشعارات), Complaint (الشكاوى للإدارة)

إضافات ربط الفرونت الجديد:
ArtisanServiceLink (الحرفي يقدّم أكثر من خدمة), RequestDismissal (حرفي تجاهل طلب مفتوح)

تعدد المجمعات (صنعة):
Compound (المجمع), Company (شركة الصيانة), Agreement + AgreementServiceLink (اتفاقية مجمع ↔ شركة
والخدمات اللي تغطيها). الساكن ومشرف المجمع والطلب يتبعون مجمع، والحرفي ومدير الشركة يتبعون شركة.

أي تغيير هنا يحتاج migration جديد (alembic revision --autogenerate) — create_all ما يحدّث الجداول الموجودة.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field, Relationship


# ---------- Enums ----------

class UserRole(str, Enum):
    customer = "customer"                # الساكن
    artisan = "artisan"
    admin = "admin"                      # مشرف المجمع (إدارة المجمع)
    owner = "owner"                      # مالك المنصة: يدير كل المجمعات والشركات
    company_manager = "company_manager"  # مدير شركة الصيانة: يضيف حرفيي شركته


class MembershipStatus(str, Enum):
    """عضوية الساكن بمجمعه: يختار المجمع بالتسجيل ومشرف المجمع يوافق."""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class RequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"   # الساكن ألغى الطلب


class NotificationType(str, Enum):
    request_received = "request_received"    # تم استلام الطلب
    request_assigned = "request_assigned"    # انربط بحرفي
    request_accepted = "request_accepted"
    request_rejected = "request_rejected"
    request_in_progress = "request_in_progress"
    request_completed = "request_completed"
    request_cancelled = "request_cancelled"
    new_request = "new_request"              # للحرفي: وصلك طلب جديد
    complaint_update = "complaint_update"    # رد الإدارة على شكوى
    payment_update = "payment_update"      # اختيار طريقة الدفع / تأكيد الاستلام
    general = "general"


class PaymentMethod(str, Enum):
    cash = "cash"
    # تجريبي: يسجل الطلب مدفوع بدون بوابة دفع حقيقية ولا بيانات بطاقة.
    # لمن نربط شركة دفع ينضاف هنا نوع حقيقي (مثل card) ويتبدل التنفيذ بـ resident_router.
    card_demo = "card_demo"


class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    paid = "paid"


class ComplaintStatus(str, Enum):
    open = "open"
    in_review = "in_review"
    resolved = "resolved"


# ---------- Compound / Company / Agreement ----------

class Compound(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None             # رقم إدارة المجمع
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Company(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Agreement(SQLModel, table=True):
    """اتفاقية بين مجمع وشركة صيانة: طلبات المجمع تروح لحرفيي الشركة بالخدمات المشمولة."""

    __table_args__ = (UniqueConstraint("compound_id", "company_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    compound_id: int = Field(foreign_key="compound.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgreementServiceLink(SQLModel, table=True):
    agreement_id: int = Field(foreign_key="agreement.id", primary_key=True)
    service_id: int = Field(foreign_key="service.id", primary_key=True)


# ---------- User ----------

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole
    # الساكن ومشرف المجمع يتبعون مجمع، والحرفي ومدير الشركة يتبعون شركة. مالك المنصة بدونهم.
    compound_id: Optional[int] = Field(default=None, foreign_key="compound.id", index=True)
    company_id: Optional[int] = Field(default=None, foreign_key="company.id", index=True)

    artisan_profile: Optional["Artisan"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"uselist": False}
    )


# ---------- ResidentProfile (الساكن) ----------

class ResidentProfile(SQLModel, table=True):
    """بيانات الساكن الإضافية — تظهر بخانة (ملفي الشخصي) بالداشبورد."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    phone: Optional[str] = None
    whatsapp: Optional[str] = None          # بيانات التواصل
    apartment_number: Optional[str] = None  # رقم الشقة / الوحدة مثل B-204
    building: Optional[str] = None          # البناية مثل "البناية B"
    floor: Optional[str] = None             # الطابق
    avatar: Optional[str] = None            # رابط الصورة (/uploads/...)
    is_subscriber: bool = Field(default=False)  # المشتركين يكدرون يختارون الحرفي
    membership_status: MembershipStatus = Field(default=MembershipStatus.pending)


# ---------- Artisan ----------

class Artisan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    # الخدمة الأساسية (أول خدمة) — القائمة الكاملة بجدول ArtisanServiceLink
    service_id: Optional[int] = Field(default=None, foreign_key="service.id")
    phone: str
    specialty: str
    description: Optional[str] = None
    location: Optional[str] = None
    verified: bool = Field(default=False)
    rejected: bool = Field(default=False)  # الإدارة رفضت الحساب (status = rejected)
    image: Optional[str] = None

    user: Optional[User] = Relationship(back_populates="artisan_profile")
    requests: List["ServiceRequest"] = Relationship(back_populates="artisan")
    reviews: List["Review"] = Relationship(back_populates="artisan")


# ---------- ArtisanServiceLink (حرفي ↔ خدمات) ----------

class ArtisanServiceLink(SQLModel, table=True):
    artisan_id: int = Field(foreign_key="artisan.id", primary_key=True)
    service_id: int = Field(foreign_key="service.id", primary_key=True)


# ---------- Service ----------

class Service(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # اسم أيقونة lucide للفرونت (zap / droplet / snowflake / hammer)


# ---------- ServiceRequest ----------

class ServiceRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="user.id")
    compound_id: Optional[int] = Field(default=None, foreign_key="compound.id", index=True)
    # صار اختياري: الطلب ممكن ينفتح قبل ما يتعين حرفي ("جاري البحث عن حرفي مناسب")
    artisan_id: Optional[int] = Field(default=None, foreign_key="artisan.id")
    service_id: int = Field(foreign_key="service.id")
    title: Optional[str] = None             # عنوان المشكلة
    description: Optional[str] = None
    location: Optional[str] = None          # "البناية - الوحدة" (تعتمد عليه إحصائيات البنايات)
    building: Optional[str] = None
    contact_name: Optional[str] = None      # "اسمك" بفورم الطلب
    unit_number: Optional[str] = None       # "رقم الوحدة" بفورم الطلب
    scheduled_at: Optional[datetime] = None  # "الوقت المناسب" = الموعد
    price: Optional[int] = None             # السعر بالدينار العراقي، يحدده الحرفي عند الإكمال
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus = Field(default=PaymentStatus.unpaid)
    paid_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    status: RequestStatus = Field(default=RequestStatus.pending)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    artisan: Optional[Artisan] = Relationship(back_populates="requests")
    review: Optional["Review"] = Relationship(
        back_populates="request", sa_relationship_kwargs={"uselist": False}
    )


# ---------- RequestImage (صور الضرر) ----------

class RequestImage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="servicerequest.id", index=True)
    url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- RequestAudio (وصف صوتي للمشكلة) ----------
# جدول مستقل (انضاف قبل Alembic، لأن create_all چان يسوي الجداول الجديدة بس). صوت واحد لكل طلب.

class RequestAudio(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    request_id: int = Field(foreign_key="servicerequest.id", index=True)
    url: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Review ----------

class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="user.id")
    artisan_id: int = Field(foreign_key="artisan.id")
    request_id: int = Field(foreign_key="servicerequest.id", unique=True)
    rating: int  # 1-5
    comment: Optional[str] = None
    is_hidden: bool = Field(default=False)  # الإدارة أخفت التقييم (ما يدخل بالمعدلات ولا يظهر للعامة)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    artisan: Optional[Artisan] = Relationship(back_populates="reviews")
    request: Optional[ServiceRequest] = Relationship(back_populates="review")


# ---------- RequestDismissal (تجاهل طلب مفتوح) ----------

class RequestDismissal(SQLModel, table=True):
    artisan_id: int = Field(foreign_key="artisan.id", primary_key=True)
    request_id: int = Field(foreign_key="servicerequest.id", primary_key=True)


# ---------- Notification ----------

class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    request_id: Optional[int] = Field(default=None, foreign_key="servicerequest.id")
    type: NotificationType = Field(default=NotificationType.general)
    title: str
    body: Optional[str] = None
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Complaint (شكوى للإدارة) ----------

class Complaint(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="user.id", index=True)
    request_id: Optional[int] = Field(default=None, foreign_key="servicerequest.id")
    subject: str
    message: str
    status: ComplaintStatus = Field(default=ComplaintStatus.open)
    admin_reply: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
