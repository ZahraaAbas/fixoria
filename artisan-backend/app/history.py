"""سجل حالات الطلب: نسجل كل تغيير بجدول RequestEvent، ونحدّث أوقات القبول والبدء بالطلب نفسه."""
from datetime import datetime
from typing import Dict, List, Optional

from sqlmodel import Session, select

from app.models import RequestEvent, RequestStatus, ServiceRequest, User

# حالة الطلب الجديدة ← نوع الحدث
STATUS_EVENT = {
    RequestStatus.accepted: "accepted",
    RequestStatus.in_progress: "started",
    RequestStatus.completed: "completed",
    RequestStatus.rejected: "rejected",
    RequestStatus.cancelled: "cancelled",
}


def record_event(session: Session, req: ServiceRequest, kind: str, actor: Optional[User] = None,
                 at: Optional[datetime] = None) -> RequestEvent:
    """يسجل حدث للطلب (بدون commit — يمشي ويه commit الإجراء نفسه)."""
    at = at or datetime.utcnow()
    if kind == "accepted" and req.accepted_at is None:
        req.accepted_at = at
    elif kind == "started" and req.started_at is None:
        req.started_at = at
    event = RequestEvent(
        request_id=req.id, kind=kind, created_at=at,
        actor_user_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else None,
    )
    session.add(event)
    session.add(req)
    return event


def record_status_change(session: Session, req: ServiceRequest, actor: Optional[User] = None) -> None:
    kind = STATUS_EVENT.get(req.status)
    if kind:
        record_event(session, req, kind, actor)


def events_by_request(session: Session, request_ids: List[int]) -> Dict[int, List[RequestEvent]]:
    if not request_ids:
        return {}
    rows = session.exec(
        select(RequestEvent).where(RequestEvent.request_id.in_(request_ids)).order_by(RequestEvent.created_at, RequestEvent.id)
    ).all()
    grouped: Dict[int, List[RequestEvent]] = {}
    for e in rows:
        grouped.setdefault(e.request_id, []).append(e)
    return grouped


def build_history(req: ServiceRequest, events: List[RequestEvent]) -> List[dict]:
    """السجل المعروض: الأحداث المسجلة، ولطلبات قبل التحديث نكمل بالأوقات المعروفة فعلًا (الإنشاء والإكمال)."""
    history = [{"kind": e.kind, "at": e.created_at, "actor_role": e.actor_role, "recorded": True} for e in events]
    kinds = {h["kind"] for h in history}
    if "created" not in kinds:
        history.insert(0, {"kind": "created", "at": req.created_at, "actor_role": None, "recorded": False})
    if req.completed_at and "completed" not in kinds:
        history.append({"kind": "completed", "at": req.completed_at, "actor_role": None, "recorded": False})
    history.sort(key=lambda h: h["at"])
    return history
