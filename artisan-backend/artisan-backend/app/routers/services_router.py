"""
Services endpoints ("التصنيفات" بالفرونت):
GET    /services        -> List services (عام)
POST   /services        -> Create service (Admin only)
PUT    /services/{id}   -> Rename/edit service (Admin only)
DELETE /services/{id}   -> Delete service (Admin only) — ممنوع إذا عليها طلبات
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.auth import require_role
from app.database import get_session
from app.models import Artisan, ArtisanServiceLink, Service, ServiceRequest, User, UserRole
from app.schemas import ServiceCreate, ServiceRead

router = APIRouter(prefix="/services", tags=["Services"])

admin_only = require_role(UserRole.admin)


def _check_name(session: Session, name: str, exclude_id: int = None) -> str:
    name = (name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم الخدمة مطلوب")
    for s in session.exec(select(Service).where(Service.name == name)).all():
        if s.id != exclude_id:
            raise HTTPException(status_code=400, detail="هذه الخدمة موجودة مسبقاً")
    return name


@router.get("", response_model=List[ServiceRead])
def list_services(session: Session = Depends(get_session)):
    return session.exec(select(Service).order_by(Service.id)).all()


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    session: Session = Depends(get_session),
    _: User = Depends(admin_only),
):
    data = payload.model_dump()
    data["name"] = _check_name(session, data["name"])
    service = Service(**data)
    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceCreate,
    session: Session = Depends(get_session),
    _: User = Depends(admin_only),
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        data["name"] = _check_name(session, data["name"], exclude_id=service.id)
    for field, value in data.items():
        setattr(service, field, value)

    session.add(service)
    session.commit()
    session.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    service_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(admin_only),
):
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")

    has_requests = session.exec(
        select(ServiceRequest).where(ServiceRequest.service_id == service_id)
    ).first()
    if has_requests:
        raise HTTPException(
            status_code=400,
            detail="ما يمكن حذف خدمة عليها طلبات — عدّل اسمها بدل الحذف",
        )

    for link in session.exec(
        select(ArtisanServiceLink).where(ArtisanServiceLink.service_id == service_id)
    ).all():
        session.delete(link)
    for artisan in session.exec(select(Artisan).where(Artisan.service_id == service_id)).all():
        remaining = session.exec(
            select(ArtisanServiceLink).where(
                ArtisanServiceLink.artisan_id == artisan.id,
                ArtisanServiceLink.service_id != service_id,
            )
        ).first()
        artisan.service_id = remaining.service_id if remaining else None
        session.add(artisan)

    session.delete(service)
    session.commit()
    return None
