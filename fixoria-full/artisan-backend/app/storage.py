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
