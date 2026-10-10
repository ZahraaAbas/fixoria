"""
اتصال قاعدة البيانات عن طريق SQLModel.
محلياً SQLite (artisan.db)، وعلى السيرفر PostgreSQL عن طريق DATABASE_URL.
"""

import os
from pathlib import Path

from sqlalchemy import inspect, text
from sqlmodel import Session, create_engine
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


BACKEND_DIR = Path(__file__).resolve().parent.parent
BASELINE_REVISION = "0001"
# رقم ثابت لقفل التحديث بـ PostgreSQL: على Vercel ممكن تشتغل أكثر من نسخة من الخادم بنفس الوقت،
# فالقفل يخلي وحدة بس تحدّث القاعدة والباقي ينتظرون
MIGRATION_LOCK_ID = 727_274


def run_migrations() -> None:
    """يحدّث القاعدة لآخر نسخة (alembic upgrade head).

    القواعد اللي انبنت بـ create_all قبل Alembic (بيها جداول بدون alembic_version)
    تنعلّم أول شي إنها بنسخة الأساس 0001، وبعدها تنطبق عليها التحديثات الجديدة.
    """
    from alembic import command
    from alembic.config import Config

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    is_postgres = engine.dialect.name == "postgresql"

    with engine.connect() as connection:
        if is_postgres:
            connection.execute(text(f"SELECT pg_advisory_lock({MIGRATION_LOCK_ID})"))
            connection.commit()
        try:
            config.attributes["connection"] = connection
            inspector = inspect(connection)
            created_before_alembic = inspector.has_table("user") and not inspector.has_table("alembic_version")
            connection.commit()
            if created_before_alembic:
                command.stamp(config, BASELINE_REVISION)
                connection.commit()
            command.upgrade(config, "head")
            connection.commit()
        finally:
            if is_postgres:
                connection.execute(text(f"SELECT pg_advisory_unlock({MIGRATION_LOCK_ID})"))
                connection.commit()


def create_db_and_tables() -> None:
    """تجهيز القاعدة عند تشغيل الخادم أو seed: صار عن طريق Alembic بدل create_all."""
    run_migrations()


def get_session():
    """Dependency تستخدميها بالـ endpoints: session: Session = Depends(get_session)"""
    with Session(engine) as session:
        yield session
