"""
قواعد تعدد المجمعات — مكان واحد تستخدمه كل الروترات حتى ما تختلف:

- الشركات المتفقة ويه المجمع = اتفاقيات فعّالة + شركة فعّالة (واختيارياً تغطي خدمة معينة).
- حرفيو المجمع = حرفيو هذي الشركات.
- مشرف المجمع يشوف بيانات مجمعه بس (compound_admin).
- الساكن يستخدم خدمات المجمع بعد موافقة المشرف وإذا المجمع فعّال (approved_resident).
"""

from typing import Iterable, List, Optional, Set

from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import (
    Agreement, AgreementServiceLink, Artisan, Company, Compound, MembershipStatus,
    ResidentProfile, User, UserRole,
)


def compound_company_ids(session: Session, compound_id: Optional[int], service_id: Optional[int] = None) -> Set[int]:
    if compound_id is None:
        return set()
    query = (
        select(Agreement.company_id)
        .join(Company, Company.id == Agreement.company_id)
        .where(Agreement.compound_id == compound_id, Agreement.is_active == True, Company.is_active == True)  # noqa: E712
    )
    if service_id is not None:
        query = query.join(AgreementServiceLink, AgreementServiceLink.agreement_id == Agreement.id).where(
            AgreementServiceLink.service_id == service_id
        )
    return set(session.exec(query).all())


def compound_service_ids(session: Session, compound_id: Optional[int]) -> Set[int]:
    """الخدمات المتوفرة بالمجمع (تغطيها اتفاقية فعّالة ويه شركة فعّالة)."""
    if compound_id is None:
        return set()
    return set(session.exec(
        select(AgreementServiceLink.service_id)
        .join(Agreement, Agreement.id == AgreementServiceLink.agreement_id)
        .join(Company, Company.id == Agreement.company_id)
        .where(Agreement.compound_id == compound_id, Agreement.is_active == True, Company.is_active == True)  # noqa: E712
    ).all())


def compound_artisan_ids(session: Session, compound_id: Optional[int], service_id: Optional[int] = None) -> Set[int]:
    company_ids = compound_company_ids(session, compound_id, service_id)
    if not company_ids:
        return set()
    return set(session.exec(
        select(Artisan.id).join(User, User.id == Artisan.user_id).where(User.company_id.in_(company_ids))
    ).all())


def only_compound_artisans(artisans: Iterable[Artisan], allowed_ids: Set[int]) -> List[Artisan]:
    return [a for a in artisans if a.id in allowed_ids]


def compound_admin(user: User = Depends(get_current_user)) -> User:
    """مشرف مجمع مربوط بمجمع — كل استعلاماته تتحدد بـ user.compound_id."""
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ماكو صلاحية لهذا الإجراء")
    if user.compound_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="حسابك غير مربوط بمجمع")
    return user


def resident_membership(session: Session, user: User) -> MembershipStatus:
    profile = session.exec(select(ResidentProfile).where(ResidentProfile.user_id == user.id)).first()
    # الساكن اللي ما عنده ملف (قبل ميزة الملف الشخصي) نعامله مثل المنتظر
    return profile.membership_status if profile else MembershipStatus.pending


def approved_resident(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> User:
    """ساكن مقبول بمجمع فعّال — شرط لكل شي غير ملفه الشخصي."""
    if user.role != UserRole.customer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ماكو صلاحية لهذا الإجراء")
    if resident_membership(session, user) != MembershipStatus.approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="عضويتك بالمجمع بانتظار موافقة الإدارة")
    compound = session.get(Compound, user.compound_id) if user.compound_id else None
    if not compound or not compound.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="مجمعك غير مفعّل على المنصة حالياً")
    return user
