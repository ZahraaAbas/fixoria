"""
موديلات قاعدة البيانات — حسب القسم 3 بخطة المشروع:
User, Artisan, Service, ServiceRequest, Review

إضافات لوحة الساكن:
ResidentProfile (بيانات الشقة والتواصل), RequestImage (صور الضرر),
Notification (الإشعارات), Complaint (الشكاوى للإدارة)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship


# ---------- Enums ----------

class UserRole(str, Enum):
    customer = "customer"
    artisan = "artisan"
    admin = "admin"


class RequestStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    in_progress = "in_progress"
    completed = "completed"


class NotificationType(str, Enum):
    request_received = "request_received"    # تم استلام الطلب
    request_assigned = "request_assigned"    # انربط بحرفي
    request_accepted = "request_accepted"
    request_rejected = "request_rejected"
    request_in_progress = "request_in_progress"
    request_completed = "request_completed"
    new_request = "new_request"              # للحرفي: وصلك طلب جديد
    complaint_update = "complaint_update"    # رد الإدارة على شكوى
    general = "general"


class ComplaintStatus(str, Enum):
    open = "open"
    in_review = "in_review"
    resolved = "resolved"


# ---------- User ----------

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    role: UserRole

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


# ---------- Artisan ----------

class Artisan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    service_id: Optional[int] = Field(default=None, foreign_key="service.id")  # نوع الخدمة اللي يقدمها
    phone: str
    specialty: str
    description: Optional[str] = None
    location: Optional[str] = None
    verified: bool = Field(default=False)
    image: Optional[str] = None

    user: Optional[User] = Relationship(back_populates="artisan_profile")
    requests: List["ServiceRequest"] = Relationship(back_populates="artisan")
    reviews: List["Review"] = Relationship(back_populates="artisan")


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
    # صار اختياري: الطلب ممكن ينفتح قبل ما يتعين حرفي ("جاري البحث عن حرفي مناسب")
    artisan_id: Optional[int] = Field(default=None, foreign_key="artisan.id")
    service_id: int = Field(foreign_key="service.id")
    description: Optional[str] = None
    location: Optional[str] = None
    contact_name: Optional[str] = None      # "اسمك" بفورم الطلب
    unit_number: Optional[str] = None       # "رقم الوحدة" بفورم الطلب
    scheduled_at: Optional[datetime] = None  # "الوقت المناسب" = الموعد
    price: Optional[int] = None             # السعر بالدينار العراقي، يحدده الحرفي عند الإكمال
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


# ---------- Review ----------

class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="user.id")
    artisan_id: int = Field(foreign_key="artisan.id")
    request_id: int = Field(foreign_key="servicerequest.id", unique=True)
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    artisan: Optional[Artisan] = Relationship(back_populates="reviews")
    request: Optional[ServiceRequest] = Relationship(back_populates="review")


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
