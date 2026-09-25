"""
Auth endpoints:
POST /auth/register
POST /auth/login
GET  /auth/me        -> بيانات المستخدم الحالي (الفرونت يناديها بعد الدخول حتى يعرف الاسم والدور)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import ResidentProfile, User, UserRole
from app.schemas import UserRegister, UserLogin, UserRead, Token
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, session: Session = Depends(get_session)):
    if payload.role == UserRole.admin:
        # حساب الأدمن ما ينسوى من التسجيل العام — بس من الـ seed أو مباشرة بالقاعدة
        raise HTTPException(status_code=403, detail="ما يمكن إنشاء حساب مشرف من التسجيل")

    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="هذا الإيميل مسجل مسبقاً")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    if user.role == UserRole.customer:
        session.add(ResidentProfile(
            user_id=user.id,
            phone=payload.phone,
            whatsapp=payload.phone,
            building=payload.building,
            apartment_number=payload.apartment_number,
            floor=payload.floor,
        ))
        session.commit()
    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="الإيميل أو كلمة المرور غير صحيحة")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user
