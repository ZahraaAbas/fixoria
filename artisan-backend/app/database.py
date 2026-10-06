"""
اتصال قاعدة البيانات عن طريق SQLModel.
محلياً SQLite (artisan.db)، وعلى السيرفر PostgreSQL عن طريق DATABASE_URL.
"""

import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./artisan.db")
# بعض الاستضافات تنطي الرابط بصيغة postgres:// القديمة، و SQLAlchemy يقبل بس postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]

# check_same_thread=False مطلوب بس مع SQLite عشان FastAPI يقدر يستخدم نفس
# الاتصال من أكثر من thread (التطوير المحلي فقط، مو مشكلة بالـ deployment الحقيقي).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# pool_pre_ping: قواعد PostgreSQL المستضافة تسد الاتصالات الخاملة، فنتأكد من الاتصال قبل كل استخدام
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args, pool_pre_ping=True)


def create_db_and_tables() -> None:
    """يسوي كل الجداول حسب الموديلز المسجلة بـ SQLModel.metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency تستخدميها بالـ endpoints: session: Session = Depends(get_session)"""
    with Session(engine) as session:
        yield session
