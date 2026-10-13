"""قراءة مفاتيح التشغيل من متغيرات البيئة بشكل متسامح.

يقبل 1 / true / yes / on (بأي حالة أحرف) ويتجاهل الفراغات وعلامات التنصيص،
حتى قيمة مثل "1" أو ' true ' بلوحة Vercel تشتغل.
"""
import os

TRUE_VALUES = {"1", "true", "yes", "on"}


def env_flag(name: str) -> bool:
    value = (os.getenv(name) or "").strip().strip("\"'").strip().lower()
    return value in TRUE_VALUES
