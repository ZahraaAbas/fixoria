"""
مساعدات تحليلية مشتركة:
- استخراج اسم البناية من نص الموقع الحر (location)
- بناء نطاق آخر 12 شهر (للـ line chart بداشبورد الحرفي وبار تشارت الأدمن)
"""

from datetime import datetime
from typing import List


def extract_building(location: str) -> str:
    """
    location نص حر يكتبه الزبون، مثل 'بناية 3 - شقة 12'.
    ناخذ الجزء قبل أول فاصل (- أو – أو ،) كاسم البناية.
    لو ماكو فاصل، نرجع النص كامل. لو فاضي، نرجعها 'غير محدد'.
    """
    if not location or not location.strip():
        return "غير محدد"

    text = location.strip()
    for sep in ["-", "–", "،", ","]:
        if sep in text:
            return text.split(sep)[0].strip()
    return text


def last_n_months(n: int = 12, reference: datetime = None) -> List[str]:
    """يرجع قائمة بآخر n شهر بصيغة YYYY-MM، من الأقدم للأحدث."""
    reference = reference or datetime.utcnow()
    months = []
    year, month = reference.year, reference.month
    for _ in range(n):
        months.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(months))


MONTH_LABELS_AR = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
    "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
    "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
}


def month_label(month_key: str) -> str:
    """'2026-03' -> 'مارس 2026'"""
    year, month = month_key.split("-")
    return f"{MONTH_LABELS_AR.get(month, month)} {year}"
