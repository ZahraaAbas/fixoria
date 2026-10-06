"""
تخزين الملفات المرفوعة (صور الضرر + صور الملفات الشخصية + الوصف الصوتي).

- محلياً: على القرص بمجلد UPLOAD_DIR، وتنخدم عبر /uploads/... (مسجلة بـ main.py كـ StaticFiles).
- على Vercel: القرص للقراءة فقط، فإذا BLOB_READ_WRITE_TOKEN موجود (يضيفه Vercel تلقائياً لما
  نربط Blob store بالمشروع) الملفات تنرفع لـ Vercel Blob ونخزن رابطها الكامل (https://...).

الواجهة تتعامل ويه الاثنين: mediaUrl() بالفرونت يكمل الروابط النسبية ويترك الكاملة مثل ما هي.
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid

from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
BLOB_TOKEN = os.getenv("BLOB_READ_WRITE_TOKEN")
USE_BLOB = bool(BLOB_TOKEN)
# نفس العنوان والإصدار اللي تستخدمها مكتبة Vercel الرسمية (@vercel/blob)
BLOB_API_URL = os.getenv("VERCEL_BLOB_API_URL", "https://vercel.com/api/blob")
BLOB_API_VERSION = "11"

MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB لكل صورة
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}

if not USE_BLOB:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10MB للوصف الصوتي (دقيقتان تقريباً تكفي بحجم أقل بكثير)
ALLOWED_AUDIO_TYPES = {
    "audio/webm": ".webm",  # تسجيل Chrome/Firefox/Edge
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",  # تسجيل Safari
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
}
# الامتداد -> النوع، لملفات الصوت اللي ننطيها لـ Blob (أول نوع لكل امتداد)
AUDIO_TYPE_BY_EXT = {}
for _type, _ext in ALLOWED_AUDIO_TYPES.items():
    AUDIO_TYPE_BY_EXT.setdefault(_ext, _type)


def _put_blob(content: bytes, pathname: str, content_type: str) -> str:
    """يرفع الملف لـ Vercel Blob (وصول عام) ويرجع رابطه الكامل."""
    request = urllib.request.Request(
        f"{BLOB_API_URL}/?{urllib.parse.urlencode({'pathname': pathname})}",
        data=content,
        method="PUT",
        headers={
            "authorization": f"Bearer {BLOB_TOKEN}",
            "x-api-version": BLOB_API_VERSION,
            "x-content-type": content_type,
            "x-add-random-suffix": "0",  # الاسم أصلاً uuid
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read())["url"]
    except (urllib.error.URLError, KeyError, ValueError) as error:
        print(f"[storage] Blob upload failed for {pathname}: {error}")
        raise HTTPException(status_code=502, detail="تعذّر حفظ الملف، حاول مرة أخرى")


def _write_file(content: bytes, ext: str, subfolder: str, content_type: str) -> str:
    """يحفظ الملف ويرجع رابطه: /uploads/... محلياً، أو https://... على Blob."""
    name = f"{uuid.uuid4().hex}{ext}"
    if USE_BLOB:
        return _put_blob(content, f"uploads/{subfolder}/{name}", content_type)

    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, name), "wb") as f:
        f.write(content)
    return f"/uploads/{subfolder}/{name}"


async def read_audio(file: UploadFile) -> tuple:
    """يتحقق من ملف الصوت ويرجع (المحتوى، الامتداد) بدون حفظ — حتى نرفض الطلب قبل إنشائه."""
    # المتصفح يرسل أحياناً النوع مع الترميز: "audio/webm;codecs=opus"
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    ext = ALLOWED_AUDIO_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="نوع الملف الصوتي غير مدعوم")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="الملف الصوتي فارغ")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="حجم الملف الصوتي أكبر من 10MB")
    return content, ext


def save_audio_content(content: bytes, ext: str, subfolder: str) -> str:
    """يحفظ صوتاً سبق التحقق منه بـ read_audio ويرجع رابطه."""
    return _write_file(content, ext, subfolder, AUDIO_TYPE_BY_EXT[ext])


async def save_image(file: UploadFile, subfolder: str) -> str:
    """يحفظ الصورة ويرجع رابطها (/uploads/<subfolder>/<name> محلياً)."""
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم — ارفع صورة (jpg/png/webp/heic)")

    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="حجم الصورة أكبر من 5MB")
    if not content:
        raise HTTPException(status_code=400, detail="الملف فارغ")

    return _write_file(content, ext, subfolder, file.content_type)
