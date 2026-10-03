"""
Notifications endpoints (لأي مستخدم مسجل — الساكن والحرفي والأدمن):
GET /notifications                -> قائمة الإشعارات (?unread_only=&limit=)
GET /notifications/unread-count   -> الرقم الأحمر على الجرس وبالسايدبار
PUT /notifications/{id}/read      -> تعليم إشعار كمقروء
PUT /notifications/read-all       -> تعليم الكل كمقروء
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.database import get_session
from app.models import Notification, User
from app.schemas import NotificationRead

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    query = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    return session.exec(query.order_by(Notification.created_at.desc()).limit(limit)).all()


@router.get("/unread-count")
def unread_count(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    count = len(session.exec(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
    ).all())
    return {"unread": count}


@router.put("/read-all")
def mark_all_read(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    unread = session.exec(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
    ).all()
    for n in unread:
        n.is_read = True
        session.add(n)
    session.commit()
    return {"updated": len(unread)}


@router.put("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    n = session.get(Notification, notification_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    n.is_read = True
    session.add(n)
    session.commit()
    session.refresh(n)
    return n
