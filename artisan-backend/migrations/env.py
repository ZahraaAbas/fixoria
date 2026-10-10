"""
بيئة Alembic: تستخدم نفس قاعدة بيانات الخادم (DATABASE_URL عن طريق app.database).
إذا الخادم مرّر اتصال جاهز (config.attributes["connection"]) نستخدمه، حتى يبقى قفل التحديث على نفس الاتصال.
"""

from alembic import context
from sqlmodel import SQLModel

import app.models  # noqa: F401  تسجيل كل الجداول بالـ metadata
from app.database import engine

config = context.config
target_metadata = SQLModel.metadata


def _configure(**kwargs):
    # SQLite ما يدعم تعديل الأعمدة والقيود مباشرة، فنستخدم batch mode (نسخ الجدول)
    context.configure(
        target_metadata=target_metadata,
        render_as_batch=engine.dialect.name == "sqlite",
        compare_type=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(url=engine.url.render_as_string(hide_password=False), literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _run(connection) -> None:
    _configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    with engine.connect() as connection:
        _run(connection)
        connection.commit()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
