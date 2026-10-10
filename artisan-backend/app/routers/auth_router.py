"""
Auth endpoints:
POST /auth/register
POST /auth/login
GET  /auth/me        -> بيانات المستخدم الحالي (الفرونت يناديها بعد الدخول حتى يعرف الاسم والدور)
POST /auth/change-password -> تغيير كلمة السر لأي مستخدم مسجل (يتأكد من الحالية)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Compound, NotificationType, ResidentProfile, User, UserRole
from app.notifications import notify
from app.schemas import PasswordChange, UserRegister, UserLogin, UserRead, Token
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, session: Session = Depends(get_session)):
    # التسجيل العام للساكن والحرفي بس. المشرفين ومدراء الشركات يضيفهم مالك المنصة،
    # والمالك من إعدادات الخادم — غيرها يعني أي واحد يكدر يسوي نفسه مالك.
    if payload.role not in (UserRole.customer, UserRole.artisan):
        raise HTTPException(status_code=403, detail="ما يمكن إنشاء هذا النوع من الحسابات من التسجيل")

    compound = None
    if payload.role == UserRole.customer:
        compound = session.get(Compound, payload.compound_id) if payload.compound_id else None
        if not compound or not compound.is_active:
            raise HTTPException(status_code=400, detail="اختر مجمعك من القائمة")

    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="هذا الإيميل مسجل مسبقاً")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        compound_id=compound.id if compound else None,
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
        # طلب الانضمام يوصل لمشرفي المجمع حتى يوافقون عليه
        for admin in session.exec(
            select(User).where(User.role == UserRole.admin, User.compound_id == compound.id)
        ).all():
            notify(session, admin.id, NotificationType.general,
                   f"طلب انضمام جديد من {user.name}", "راجع صفحة السكان للموافقة أو الرفض")
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


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: PasswordChange,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # 400 = الحالية غلط، 422 = الجديدة مرفوضة (قصيرة أو نفس القديمة)
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="كلمة السر الحالية غير صحيحة")
    if payload.new_password == payload.current_password:
        raise HTTPException(status_code=422, detail="كلمة السر الجديدة لازم تختلف عن الحالية")

    user.password_hash = hash_password(payload.new_password)
    session.add(user)
    session.commit()
