"""
اتصال قاعدة البيانات — SQLite عن طريق SQLModel.
Day 1: بس نجهز الـ engine والـ session، الموديلز بملف models.py
"""

import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./artisan.db")

# check_same_thread=False مطلوب بس مع SQLite عشان FastAPI يقدر يستخدم نفس
# الاتصال من أكثر من thread (التطوير المحلي فقط، مو مشكلة بالـ deployment الحقيقي).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    """يسوي كل الجداول حسب الموديلز المسجلة بـ SQLModel.metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency تستخدميها بالـ endpoints: session: Session = Depends(get_session)"""
    with Session(engine) as session:
        yield session
