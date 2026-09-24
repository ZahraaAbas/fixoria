"""
نقطة الدخول — نشغلها بـ:
    uvicorn app.main:app --reload

بعدها Swagger docs على: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import create_db_and_tables
from app.routers import (
    auth_router,
    artisans_router,
    services_router,
    requests_router,
    reviews_router,
    admin_router,
    resident_router,
    notifications_router,
)
from app.storage import UPLOAD_DIR

app = FastAPI(title="Artisan Management API", version="0.2.0")

# CORS مفتوح وقت التطوير — نضيقه لاحقاً إذا احتجنا (يوم 3 بالخطة).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/")
def root():
    return {"status": "ok", "service": "Artisan Management API"}


app.include_router(auth_router.router)
app.include_router(artisans_router.router)
app.include_router(services_router.router)
app.include_router(requests_router.router)
app.include_router(reviews_router.router)
app.include_router(admin_router.router)
app.include_router(resident_router.router)
app.include_router(notifications_router.router)

# صور الضرر وصور الملفات الشخصية: /uploads/...
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
