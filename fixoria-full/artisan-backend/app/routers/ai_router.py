"""
AI Service Assistant:
POST /ai/service-request   -> يحلل وصف الساكن ويرجّع مسودة طلب (ما ينشئ حجز!)

بعد ما الساكن يراجع المسودة ويضغط (تأكيد) الفرونت يرسلها لـ POST /resident/requests الموجود،
فيشتغل نفس التعيين التلقائي للحرفي والإشعارات — ما اكو نظام حجز ثاني.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.ai_service import AIServiceError, AIUnavailableError, analyze_request
from app.auth import require_role
from app.database import get_session
from app.models import Service, User, UserRole
from app.schemas import AIServiceRequestInput, AIServiceRequestOutput

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

# حماية بسيطة من استهلاك رصيد الـ API: 10 طلبات بالدقيقة لكل ساكن (بالذاكرة، تكفي للـ MVP)
RATE_LIMIT = 10
RATE_WINDOW_SECONDS = 60
_recent_calls: Dict[int, Deque[float]] = defaultdict(deque)


def _check_rate_limit(user_id: int) -> None:
    now = time.monotonic()
    calls = _recent_calls[user_id]
    while calls and now - calls[0] > RATE_WINDOW_SECONDS:
        calls.popleft()
    if len(calls) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="طلبات كثيرة بوقت قصير، انتظر دقيقة وحاول مرة ثانية")
    calls.append(now)


@router.post("/service-request", response_model=AIServiceRequestOutput)
def ai_service_request(
    payload: AIServiceRequestInput,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(UserRole.customer)),
):
    _check_rate_limit(user.id)
    services = session.exec(select(Service)).all()
    try:
        return analyze_request(
            payload.message.strip(),
            [t.model_dump() for t in payload.history],
            services,
        )
    except AIUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="المساعد الذكي غير مفعّل حالياً، تكدر تستخدم الطلب اليدوي",
        )
    except AIServiceError:
        raise HTTPException(
            status_code=502,
            detail="تعذّر تحليل طلبك حالياً، حاول مرة ثانية أو استخدم الطلب اليدوي",
        )
