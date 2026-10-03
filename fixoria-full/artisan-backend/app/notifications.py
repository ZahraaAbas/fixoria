"""
مساعد إنشاء الإشعارات — ينادى من أي روتر يغير حالة طلب أو شكوى.
الإشعار ينضاف للـ session بس؛ الـ commit مسؤولية الـ endpoint اللي ناداه.
"""

from typing import Optional

from sqlmodel import Session

from app.models import Notification, NotificationType


def notify(
    session: Session,
    user_id: int,
    type: NotificationType,
    title: str,
    body: Optional[str] = None,
    request_id: Optional[int] = None,
) -> Notification:
    n = Notification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        request_id=request_id,
    )
    session.add(n)
    return n
