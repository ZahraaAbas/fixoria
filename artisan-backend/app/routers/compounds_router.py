"""
GET /compounds -> المجمعات المفعّلة (عامة) — قائمة اختيار المجمع بصفحة تسجيل الساكن.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import Compound
from app.schemas import CompoundOption

router = APIRouter(prefix="/compounds", tags=["Compounds"])


@router.get("", response_model=List[CompoundOption])
def list_active_compounds(session: Session = Depends(get_session)):
    return session.exec(
        select(Compound).where(Compound.is_active == True).order_by(Compound.name)  # noqa: E712
    ).all()
