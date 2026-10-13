"""
وضع العرض (DEMO_LOGIN=1): دخول بضغطة وحدة لحسابات التجربة بدون إيميل أو كلمة سر — للعروض بس.

تحذير: الموقع عام، فأي شخص عنده الرابط يكدر يدخل بأي دور وقت ما الوضع مفعّل.
فعّله وقت العرض واطفيه بعده.

حسابات العرض:
- الساكن / الحرفي / المشرف: حسابات الـ seed (customer@demo.com، artisan@demo.com، admin@demo.com)
- مدير الشركة / المالك: ينعملن أول مرة إذا ما موجودات، بكلمة سر عشوائية ما ينفع الدخول بيها
  (فما يصيرن باب خلفي بعد ما يطفى الوضع)
"""
import secrets
from typing import Optional

from sqlmodel import Session, select

from app.auth import hash_password
from app.flags import env_flag
from app.models import Company, User, UserRole

DEMO_ROLES = {
    "resident": ("customer@demo.com", UserRole.customer),
    "artisan": ("artisan@demo.com", UserRole.artisan),
    "admin": ("admin@demo.com", UserRole.admin),
    "company": ("company@demo.com", UserRole.company_manager),
    "owner": ("owner@demo.com", UserRole.owner),
}
# الأدوار الي ننشئ حسابها إذا ناقص (الباقي لازم يجي من الـ seed)
CREATABLE = {"company", "owner"}


def demo_enabled() -> bool:
    return env_flag("DEMO_LOGIN")


def demo_user(session: Session, role: str) -> Optional[User]:
    if role not in DEMO_ROLES:
        return None
    email, user_role = DEMO_ROLES[role]
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        return user if user.role == user_role else None
    if role not in CREATABLE:
        return None

    company_id = None
    if role == "company":
        company = session.exec(select(Company).where(Company.is_active == True).order_by(Company.id)).first()  # noqa: E712
        if not company:
            return None
        company_id = company.id
    user = User(
        name="مدير الشركة (عرض)" if role == "company" else "المالك (عرض)",
        email=email,
        # كلمة سر عشوائية ما يعرفها أحد: الحساب ينفتح بس من زر العرض
        password_hash=hash_password(secrets.token_urlsafe(32)),
        role=user_role,
        company_id=company_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
