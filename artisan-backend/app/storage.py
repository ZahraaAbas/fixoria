"""
تخزين الملفات المرفوعة (صور الضرر + صورة الملف الشخصي) على القرص المحلي.
تنخدم عبر /uploads/... (مسجلة بـ main.py كـ StaticFiles).

للـ deployment الحقيقي الأفضل تنقلونها لـ S3 أو ما يشبهه — بس الواجهة (save_image)
تبقى نفسها فالتغيير يصير بهذا الملف بس.
"""

import os
import uuid

from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB لكل صورة
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}

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


def _write_file(content: bytes, ext: str, subfolder: str) -> str:
    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
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
    """يحفظ صوتاً سبق التحقق منه بـ read_audio ويرجع الرابط النسبي."""
    return _write_file(content, ext, subfolder)


async def save_image(file: UploadFile, subfolder: str) -> str:
    """يحفظ الصورة ويرجع الرابط النسبي (/uploads/<subfolder>/<name>)."""
    ext = ALLOWED_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم — ارفع صورة (jpg/png/webp/heic)")

    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="حجم الصورة أكبر من 5MB")
    if not content:
        raise HTTPException(status_code=400, detail="الملف فارغ")

    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(folder, name), "wb") as f:
        f.write(content)

    return f"/uploads/{subfolder}/{name}"
