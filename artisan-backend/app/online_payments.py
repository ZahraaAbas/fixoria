"""
منطق الدفع الأونلاين (مستقل عن البوابة):

- start_payment: ينشئ محاولة دفع بمبلغ الطلب ويجيب رابط صفحة الدفع من البوابة
- refresh:       يسأل البوابة عن حالة محاولة معلّقة (أو تنتهي صلاحيتها)
- apply_result:  يطبّق نتيجة البوابة مرة وحدة بس (idempotent) ويعلّم الطلب مدفوع

الطلب ما ينعلّم مدفوع إلا من البوابة نفسها (تحقق أو إشعار موقّع)، وبنفس المبلغ بالضبط.
"""
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlmodel import Session, select

from app.gateways import GatewayError, GatewayResult, get_gateway
from app.models import (
    Artisan, Compound, NotificationType, PaymentAttempt, PaymentMethod, PaymentStatus, RequestStatus,
    ServiceRequest, User,
)
from app.notifications import notify

EXPIRY = timedelta(minutes=30)
FINAL = {"paid", "failed", "cancelled", "expired"}


def online_available(session: Session, req: ServiceRequest) -> bool:
    compound = session.get(Compound, req.compound_id) if req.compound_id else None
    gateway = get_gateway(compound.payment_provider) if compound else None
    return bool(compound and compound.online_payments_enabled and gateway and gateway.is_available())


def pending_attempt(session: Session, req: ServiceRequest):
    return session.exec(
        select(PaymentAttempt)
        .where(PaymentAttempt.request_id == req.id, PaymentAttempt.status == "pending")
        .order_by(PaymentAttempt.created_at.desc())
    ).first()


def start_payment(session: Session, req: ServiceRequest, user: User) -> PaymentAttempt:
    if req.status != RequestStatus.completed:
        raise HTTPException(status_code=400, detail="الدفع متاح بس للطلبات المكتملة")
    if req.price is None:
        raise HTTPException(status_code=400, detail="الحرفي ما حدد السعر بعد")
    if req.payment_status == PaymentStatus.paid:
        raise HTTPException(status_code=409, detail="هذا الطلب مدفوع مسبقاً")
    if not online_available(session, req):
        raise HTTPException(status_code=400, detail="الدفع الأونلاين غير مفعّل بهذا المجمع")

    # محاولة معلّقة وبعدها صالحة وبنفس المبلغ = نرجعها بدل ما نفتح عملية ثانية
    existing = pending_attempt(session, req)
    if existing:
        refresh(session, existing)
        if existing.status == "pending" and existing.amount == req.price:
            return existing
        if existing.status == "paid":
            raise HTTPException(status_code=409, detail="هذا الطلب مدفوع مسبقاً")

    compound = session.get(Compound, req.compound_id)
    gateway = get_gateway(compound.payment_provider)
    attempt = PaymentAttempt(request_id=req.id, compound_id=req.compound_id, provider=gateway.name,
                             amount=req.price, created_by=user.id)
    session.add(attempt)
    session.flush()  # نحتاج رقم المحاولة قبل البوابة
    try:
        attempt.provider_ref, attempt.checkout_url = gateway.create_checkout(attempt)
    except GatewayError as e:
        session.rollback()
        raise HTTPException(status_code=502, detail=f"تعذّر فتح صفحة الدفع: {e}")
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


def refresh(session: Session, attempt: PaymentAttempt) -> PaymentAttempt:
    if attempt.status in FINAL:
        return attempt
    if datetime.utcnow() - attempt.created_at > EXPIRY and not attempt.provider_status:
        attempt.status = "expired"
        attempt.updated_at = datetime.utcnow()
        session.add(attempt)
        session.commit()
        return attempt
    gateway = get_gateway(attempt.provider)
    if not gateway:
        return attempt
    try:
        result = gateway.fetch_status(attempt)
    except GatewayError:
        return attempt  # نحاول مرة ثانية بالسؤال الجاي
    return apply_result(session, attempt, result)


def apply_result(session: Session, attempt: PaymentAttempt, result: GatewayResult) -> PaymentAttempt:
    if attempt.status in FINAL or result.status == "pending":
        if result.provider_status and attempt.provider_status != result.provider_status and attempt.status == "pending":
            attempt.provider_status = result.provider_status
            session.add(attempt)
            session.commit()
        return attempt

    now = datetime.utcnow()
    attempt.provider_status = result.provider_status
    attempt.updated_at = now
    req = session.get(ServiceRequest, attempt.request_id)

    if result.status == "paid":
        if result.amount is not None and result.amount != attempt.amount:
            # البوابة تقول مبلغ غير المطلوب — ما نعلّم الطلب مدفوع، وتبقى للمراجعة
            attempt.status = "failed"
            attempt.note = f"amount_mismatch: expected {attempt.amount}, got {result.amount}"
        else:
            attempt.status = "paid"
            attempt.paid_at = now
            if req.payment_status == PaymentStatus.paid:
                attempt.note = "already_paid"  # اندفع بطريقة ثانية قبلها — يحتاج إرجاع يدوي
            else:
                req.payment_status = PaymentStatus.paid
                req.payment_method = PaymentMethod.online
                req.paid_at = now
                session.add(req)
                artisan = session.get(Artisan, req.artisan_id) if req.artisan_id else None
                if artisan:
                    notify(session, artisan.user_id, NotificationType.payment_update,
                           f"تم دفع الطلب رقم #{req.id} أونلاين", f"{attempt.amount:,} د.ع", req.id)
                notify(session, req.customer_id, NotificationType.payment_update,
                       f"تم استلام دفعتك للطلب رقم #{req.id}", f"{attempt.amount:,} د.ع — أونلاين", req.id)
    else:
        attempt.status = result.status if result.status in FINAL else "failed"

    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt
