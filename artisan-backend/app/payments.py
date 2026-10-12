"""
ملخص المدفوعات الشهري (تجريبي) — نفس الحساب لمشرف المجمع ومدير الشركة.

يحسب الطلبات المكتملة بالشهر (حسب وقت الإكمال): المجموع، والمدفوع، وغير المدفوع، وحسب طريقة الدفع.
الطلب المكتمل بدون سعر ينحسب بـ unpriced وما يدخل بالمبالغ.
"""

from datetime import datetime
from typing import Iterable, Optional

from fastapi import HTTPException

from app.models import PaymentMethod, PaymentStatus, RequestStatus, ServiceRequest
from app.schemas import PaymentsSummary


def month_bounds(month: Optional[str]):
    """'2026-10' -> (بداية الشهر، بداية الشهر الجاي). بدون قيمة = الشهر الحالي."""
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            raise HTTPException(status_code=400, detail="صيغة الشهر لازم تكون YYYY-MM")
    else:
        now = datetime.utcnow()
        start = datetime(now.year, now.month, 1)
    end = datetime(start.year + (start.month == 12), start.month % 12 + 1, 1)
    return start, end


def summarize(requests: Iterable[ServiceRequest], month: Optional[str]) -> PaymentsSummary:
    start, end = month_bounds(month)
    summary = PaymentsSummary(month=start.strftime("%Y-%m"))
    for r in requests:
        if r.status != RequestStatus.completed or not r.completed_at or not (start <= r.completed_at < end):
            continue
        summary.completed += 1
        if r.price is None:
            summary.unpriced += 1
            continue
        summary.total += r.price
        if r.payment_status == PaymentStatus.paid:
            summary.paid += r.price
            if r.payment_method == PaymentMethod.cash:
                summary.cash += r.price
            elif r.payment_method == PaymentMethod.card_demo:
                summary.card_demo += r.price
            elif r.payment_method == PaymentMethod.online:
                summary.online += r.price
        else:
            summary.unpaid += r.price
    return summary
