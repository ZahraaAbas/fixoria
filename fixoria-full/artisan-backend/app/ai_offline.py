"""
محلل محلي للمساعد الذكي — يشتغل تلقائياً إذا ماكو AI_API_KEY أو فشل الاتصال بمزود الـ AI.
بدون إنترنت وبدون مكتبات: كلمات مفتاحية (عربي فصيح + لهجة عراقية + إنجليزي).

يرجّع نفس الشكل اللي يرجّعه الـ AI (_LLMOutput كـ dict)، وبعدها يمر على نفس فحوصات
ai_service (service_id من جدول Service، أولوية صالحة، وقت بالمستقبل...).

الخدمات تنقرأ من قاعدة البيانات: كل خدمة نطابقها بعائلة كلمات حسب اسمها/أيقونتها/وصفها،
فإذا المشرف ضاف خدمة جديدة من لوحته (مثلاً "صباغة") تنفهم تلقائياً.
"""

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------- تطبيع النص
_DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")
_AR_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ة": "ه", "ى": "ي", "ؤ": "و", "ئ": "ي",
                         "گ": "ك", "چ": "ج", "ڤ": "ف", "پ": "ب"})
_PREFIXES = ("وبال", "وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ل")
_LETTERS = re.compile(r"[^\W\d_]+", re.UNICODE)


def normalize(text: str) -> str:
    text = _DIACRITICS.sub("", text or "").translate(_AR_MAP).lower()
    return " ".join(text.split())


class _Text:
    def __init__(self, raw: str):
        self.norm = normalize(raw)
        self.words = _LETTERS.findall(self.norm)
        self.variants = set()
        for w in self.words:
            self.variants.add(w)
            for p in _PREFIXES:
                if w.startswith(p) and len(w) - len(p) >= 2:
                    self.variants.add(w[len(p):])

    def has(self, keyword: str) -> bool:
        kw = normalize(keyword)
        if not kw:
            return False
        if not _LETTERS.fullmatch(kw):                       # عبارة من كلمتين أو فيها رموز
            return f" {kw}" in f" {self.norm}"
        if len(kw) <= 2 or (kw.isascii() and len(kw) <= 3):  # "ac", "tv"، كلمات قصيرة → تطابق كامل
            return kw in self.variants
        return any(v.startswith(kw) for v in self.variants)

    def any(self, keywords) -> bool:
        return any(self.has(k) for k in keywords)


# ---------------------------------------------------------------- عوائل الخدمات
# match: كيف نعرف إن خدمة بالـ DB تنتمي لهذه العائلة (اسم/وصف/أيقونة)
FAMILIES: List[Dict[str, Any]] = [
    {"match": ["كهرب", "electric"], "icons": ["zap"],
     "keywords": ["كهرب", "ضوء", "اضاءه", "لمبه", "مصباح", "فيش", "بلك", "سويج", "قاطع", "جوزه", "تمديد", "شراره",
                  "تماس", "انقطاع", "بريز", "electric", "power", "outlet", "socket", "switch", "light", "lights",
                  "bulb", "breaker", "fuse", "wiring", "spark"]},
    {"match": ["سباك", "plumb"], "icons": ["droplet"],
     "keywords": ["سباك", "تسريب", "تسرب", "يسرب", "يخر", "يقطر", "حنفيه", "صنبور", "مغسله", "مجاري", "بالوعه", "انسداد",
                  "مسدود", "ماسوره", "مواسير", "بوري", "انبوب", "مرحاض", "تواليت", "سيفون", "دوش", "سخان", "ماء", "مياه",
                  "plumb", "leak", "drip", "faucet", "tap", "sink", "pipe", "drain", "clog", "blocked", "toilet",
                  "shower", "water heater", "water"]},
    {"match": ["تكييف", "تبريد", "مكيف", "hvac", "air condition"], "icons": ["snowflake"],
     "keywords": ["مكيف", "تكييف", "سبلت", "مبرده", "تبريد", "ما يبرد", "تدفئه", "فريون", "كومبريسر", "ac", "a/c",
                  "air condition", "aircon", "hvac", "cooling", "heating", "split unit", "thermostat"]},
    {"match": ["نجار", "carpent"], "icons": ["hammer"],
     "keywords": ["نجار", "خشب", "باب", "ابواب", "شباك", "شبابيك", "نافذه", "خزانه", "كبت", "دولاب", "قفل", "مفصله",
                  "جرار", "اثاث", "carpent", "wood", "door", "cabinet", "wardrobe", "closet", "hinge", "lock",
                  "drawer", "shelf", "furniture"]},
    {"match": ["صبغ", "صباغ", "دهان", "طلاء", "paint"], "icons": ["paintbrush", "paint-roller", "brush"],
     "keywords": ["صبغ", "صباغ", "دهان", "طلاء", "رطوبه", "تقشر", "متقشر", "paint", "peeling", "damp"]},
    {"match": ["تنظيف", "نظاف", "clean"], "icons": ["sparkles", "spray-can"],
     "keywords": ["تنظيف", "نظافه", "تعقيم", "سجاد", "كنب", "قنفات", "clean", "cleaning", "carpet", "sofa", "sanitize"]},
    {"match": ["اجهز", "appliance"], "icons": ["refrigerator", "washing-machine", "plug"],
     "keywords": ["ثلاجه", "براد", "مجمده", "فريزر", "غساله", "نشافه", "طباخ", "فرن", "مايكرويف", "جلايه",
                  "fridge", "refrigerator", "freezer", "washing machine", "washer", "dryer", "oven", "stove",
                  "microwave", "dishwasher", "appliance"]},
]

URGENT_WORDS = ["عاجل", "طارئ", "طوارئ", "فورا", "حالا", "هسه", "ضروري", "بسرعه", "urgent", "emergency", "asap",
                "immediately", "right now"]
HAZARD_WORDS = ["ريحه غاز", "ريحة غاز", "تسرب غاز", "تسريب غاز", "دخان", "حريق", "شراره", "تماس", "صعقه", "فيضان", "تطوف", "غرق",
                "gas leak", "gas smell", "smell gas", "smoke", "fire", "spark", "sparks", "shock", "flood", "flooding"]
REQUEST_ONLY = ["احتاج", "اريد", "ابي", "ابغي", "بدي", "محتاج", "اطلب", "i need", "need a", "i want", "looking for"]

SPOTS = [
    (["مطبخ", "kitchen"], "المطبخ"),
    (["حمام", "مرافق", "bathroom"], "الحمام"),
    (["غرفه النوم", "غرفه نوم", "غرفتي", "bedroom"], "غرفة النوم"),
    (["صاله", "صالون", "هول", "living room", "hall"], "الصالة"),
    (["سطح", "roof"], "السطح"),
    (["بلكونه", "شرفه", "balcony"], "الشرفة"),
]

_WEEKDAYS = [(["الاثنين", "monday"], 0), (["الثلاثاء", "tuesday"], 1), (["الاربعاء", "wednesday"], 2),
             (["الخميس", "thursday"], 3), (["الجمعه", "friday"], 4), (["السبت", "saturday"], 5), (["الاحد", "sunday"], 6)]
_PARTS = [(["صباح", "الصبح", "morning"], 10), (["ظهر", "الظهر", "noon"], 12),
          (["عصر", "العصر", "afternoon"], 16), (["مساء", "المسا", "المغرب", "evening", "tonight", "الليله"], 18)]
_CLOCK = re.compile(r"(?:الساعه|at)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)?|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b")


def _family_of(service) -> Optional[Dict[str, Any]]:
    label = _Text(f"{service.name} {service.description or ''}")
    icon = (getattr(service, "icon", None) or "").lower()
    for fam in FAMILIES:
        if icon in fam["icons"] or label.any(fam["match"]):
            return fam
    return None


def _classify(text: _Text, services) -> (Optional[int], float):
    best_id, best = None, 0.0
    for s in services:
        fam = _family_of(s)
        words = list(fam["keywords"]) if fam else []
        # كلمات اسم الخدمة نفسها (لأي خدمة جديدة يضيفها المشرف)
        words += [w for w in _LETTERS.findall(normalize(s.name)) if len(w) >= 3 and w not in ("عامه", "صيانه")]
        hits = sum(1 for w in set(words) if text.has(w))
        if hits > best:
            best_id, best = s.id, float(hits)
    if best_id is None:
        return None, 0.0
    return best_id, round(min(0.9, 0.6 + 0.1 * best), 2)


def _time(text: _Text, now: datetime) -> Optional[str]:
    """نفس قواعد الـ prompt: يوم بدون ساعة = 10:00، اليوم وفات 10 = أقرب ساعة بعد ساعتين."""
    day: Optional[datetime] = None
    if text.any(["بعد باجر", "بعد بكره", "بعد غد", "day after tomorrow"]):
        day = now + timedelta(days=2)
    elif text.any(["باجر", "باكر", "بكره", "بكرا", "غدا", "tomorrow"]) or "غد" in text.variants:
        day = now + timedelta(days=1)
    elif text.any(["اليوم", "today", "tonight", "الليله", "هسه", "الان", "now"]):
        day = now
    else:
        for words, wd in _WEEKDAYS:
            if text.any(words):
                delta = (wd - now.weekday()) % 7 or 7
                day = now + timedelta(days=delta)
                break

    hour, minute = None, 0
    m = _CLOCK.search(text.norm)
    if m:
        hour = int(m.group(1) or m.group(4))
        minute = int(m.group(2) or m.group(5) or 0)
        suffix = (m.group(3) or m.group(6) or "").lower()
        morning = text.any(["صباح", "الصبح", "morning"])
        if suffix in ("pm", "م") or (not suffix and not morning and 1 <= hour <= 7):
            hour = hour + 12 if hour < 12 else hour
        if hour > 23 or minute > 59:
            hour = None
    if hour is None:
        for words, h in _PARTS:
            if text.any(words):
                hour = h
                break

    if day is None and hour is None:
        return None
    if day is None:
        day = now
    if hour is None:
        hour = 10
    candidate = day.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= now:
        if day.date() == now.date() and m is None:
            # اليوم وفات الوقت: أقرب ساعة كاملة بعد ساعتين
            candidate = (now + timedelta(hours=2)).replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        else:
            candidate += timedelta(days=1)
    return candidate.strftime("%Y-%m-%dT%H:%M")


def analyze_offline(message: str, history: List[Dict[str, str]], services, now: datetime) -> Dict[str, Any]:
    """يرجّع dict بنفس مفاتيح _LLMOutput."""
    user_turns = [t["content"] for t in history if t.get("role") == "user"][-4:]
    current = _Text(message)
    combined = _Text(" ".join(user_turns + [message]))

    service_id, confidence = _classify(current, services)
    problem_source = message
    if service_id is None:
        # رسالة مكملة ("باجر الساعة 5") — نرجع للرسائل السابقة
        service_id, confidence = _classify(combined, services)
        for turn in reversed(user_turns):
            if _classify(_Text(turn), services)[0] is not None:
                problem_source = turn
                break

    problem_text = _Text(problem_source)
    too_short = len(problem_text.words) <= 4 and problem_text.any(REQUEST_ONLY)
    problem = None if too_short else " ".join(problem_source.split())[:500]
    if problem is None and service_id is not None:
        # "أحتاج سباك" ثم وصف بالرسالة التالية
        extra = [t for t in user_turns + [message] if not (_Text(t).any(REQUEST_ONLY) and len(_Text(t).words) <= 4)]
        problem = " ".join(extra)[:500] or None

    spot = next((label for words, label in SPOTS if combined.any(words)), None)
    urgent = combined.any(URGENT_WORDS) or combined.any(HAZARD_WORDS)
    service_name = next((s.name for s in services if s.id == service_id), None)

    if service_id is None:
        question = "ما كدرت أحدد نوع الخدمة. هل المشكلة كهرباء، سباكة، تكييف، نجارة، أو شي ثاني؟ وصفها بجملة وحدة."
    elif not problem:
        question = f"تمام، خدمة {service_name}. شنو المشكلة بالضبط؟"
    else:
        question = None

    where = f" في {spot}" if spot else ""
    return {
        "service_id": service_id,
        "problem": problem,
        "priority": "urgent" if urgent else "normal",
        "preferred_time": _time(combined, now.replace(tzinfo=None)),
        "additional_details": [f"المكان: {spot}"] if spot else [],
        "confidence": confidence if problem else 0.0,
        "assistant_message": (f"فهمت إنك تحتاج خدمة {service_name}{where}. راجع الملخص وأكّد الطلب أو عدّله."
                              if service_id and problem else None),
        "clarifying_question": question,
    }
