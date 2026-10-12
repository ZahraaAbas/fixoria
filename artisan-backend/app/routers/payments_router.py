"""
إشعارات بوابات الدفع + صفحة بوابة التجربة.

POST /payments/webhook/{provider}     -> البوابة تبلغنا بنتيجة الدفع (موقّعة؛ بدون تسجيل دخول)
GET  /payments/sandbox/{ref}          -> تفاصيل صفحة الدفع التجريبية (للساكن صاحب الطلب)
POST /payments/sandbox/{ref}/decide   -> "البوابة التجريبية" تسجل نتيجة الدفع (نجح / رُفض / أُلغي)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from app.database import get_session
from app.gateways import GatewayError, get_gateway
from app.models import Compound, PaymentAttempt, ServiceRequest, User
from app.online_payments import apply_result, refresh
from app.schemas import OnlinePaymentRead, SandboxCheckout, SandboxDecision
from app.tenancy import approved_resident

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/webhook/{provider}")
async def payment_webhook(provider: str, request: Request, session: Session = Depends(get_session)):
    gateway = get_gateway(provider)
    if not gateway or not gateway.is_available():
        raise HTTPException(status_code=404, detail="بوابة غير معروفة")
    body = await request.body()
    try:
        result = gateway.parse_webhook(body, {k.lower(): v for k, v in request.headers.items()})
    except GatewayError:
        raise HTTPException(status_code=400, detail="إشعار غير صالح")
    attempt = session.exec(
        select(PaymentAttempt).where(PaymentAttempt.provider == provider, PaymentAttempt.provider_ref == result.provider_ref)
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="عملية الدفع غير موجودة")
    attempt = apply_result(session, attempt, result)
    return {"ok": True, "status": attempt.status}


def _sandbox_attempt(session: Session, ref: str, user: User) -> PaymentAttempt:
    gateway = get_gateway("sandbox")
    if not gateway or not gateway.is_available():
        raise HTTPException(status_code=404, detail="بوابة التجربة مطفية")
    attempt = session.exec(
        select(PaymentAttempt).where(PaymentAttempt.provider == "sandbox", PaymentAttempt.provider_ref == ref)
    ).first()
    req = session.get(ServiceRequest, attempt.request_id) if attempt else None
    if not attempt or not req or req.customer_id != user.id:
        raise HTTPException(status_code=404, detail="عملية الدفع غير موجودة")
    return attempt


@router.get("/sandbox/{ref}", response_model=SandboxCheckout)
def sandbox_checkout(ref: str, session: Session = Depends(get_session), user: User = Depends(approved_resident)):
    attempt = refresh(session, _sandbox_attempt(session, ref, user))
    req = session.get(ServiceRequest, attempt.request_id)
    compound = session.get(Compound, attempt.compound_id) if attempt.compound_id else None
    return SandboxCheckout(ref=ref, attempt_id=attempt.id, request_id=req.id, request_title=req.title,
                           compound_name=compound.name if compound else None, amount=attempt.amount,
                           status=attempt.status)


@router.post("/sandbox/{ref}/decide", response_model=OnlinePaymentRead)
def sandbox_decide(ref: str, payload: SandboxDecision, session: Session = Depends(get_session),
                   user: User = Depends(approved_resident)):
    """يمثّل البوابة: يحفظ قرار الدفع عندها، وبعدين نتحقق منه بنفس طريق البوابات الحقيقية."""
    attempt = _sandbox_attempt(session, ref, user)
    if attempt.status != "pending":
        raise HTTPException(status_code=409, detail="عملية الدفع منتهية")
    attempt.provider_status = payload.outcome
    session.add(attempt)
    session.commit()
    return OnlinePaymentRead.model_validate(refresh(session, attempt), from_attributes=True)
