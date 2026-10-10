"""
إنشاء حساب مالك المنصة من الإعدادات (OWNER_EMAIL و OWNER_PASSWORD، واختياري OWNER_NAME).

ينادى عند تشغيل الخادم بعد تحديث القاعدة. ينشئ الحساب مرة وحدة بس إذا ما موجود
مستخدم بنفس الإيميل؛ ما يغيّر كلمة سر حساب موجود (المالك يغيرها من "حسابي")،
وما يحوّل حساب موجود بدور ثاني لمالك. كلمة السر تبقى بإعدادات الاستضافة، مو بالكود.
"""

import logging
import os

from sqlmodel import Session, select

from app.auth import hash_password
from app.database import engine
from app.models import User, UserRole

logger = logging.getLogger("uvicorn.error")
MIN_PASSWORD_LENGTH = 8


def ensure_owner() -> None:
    email = (os.getenv("OWNER_EMAIL") or "").strip()
    password = os.getenv("OWNER_PASSWORD") or ""
    if not email or not password:
        return
    if len(password) < MIN_PASSWORD_LENGTH:
        logger.warning("OWNER_PASSWORD أقصر من %s أحرف — ما انعمل حساب المالك", MIN_PASSWORD_LENGTH)
        return

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            if existing.role != UserRole.owner:
                logger.warning("OWNER_EMAIL مستخدم بحساب دوره %s — ما تحوّل لمالك", existing.role.value)
            return
        session.add(User(
            name=(os.getenv("OWNER_NAME") or "").strip() or "مالك المنصة",
            email=email,
            password_hash=hash_password(password),
            role=UserRole.owner,
        ))
        session.commit()
        logger.info("انعمل حساب مالك المنصة: %s", email)
