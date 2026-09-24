"""
Services endpoints:
GET  /services   -> List services
POST /services   -> Create service (Admin only)
"""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import Service, User, UserRole
from app.schemas import ServiceCreate, ServiceRead
from app.auth import require_role

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("", response_model=List[ServiceRead])
def list_services(session: Session = Depends(get_session)):
    return session.exec(select(Service)).all()


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.admin)),
):
    service = Service(**payload.model_dump())
    session.add(service)
    session.commit()
    session.refresh(service)
    return service
