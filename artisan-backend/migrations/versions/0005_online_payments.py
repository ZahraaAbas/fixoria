"""online payments

الدفع الأونلاين الحقيقي عبر بوابة دفع:
- طريقة دفع جديدة online
- إعدادات كل مجمع: البوابة (payment_provider) وهل الدفع الأونلاين مفعّل (افتراضيًا لا)
- جدول paymentattempt: كل محاولة دفع وحالتها حسب البوابة

ما نغيّر أي بيانات موجودة.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, Sequence[str], None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'online'")

    with op.batch_alter_table('compound') as batch:
        batch.add_column(sa.Column('payment_provider', sa.String(), nullable=True))
        batch.add_column(sa.Column('online_payments_enabled', sa.Boolean(), nullable=False, server_default=sa.false()))
    with op.batch_alter_table('compound') as batch:
        batch.alter_column('online_payments_enabled', existing_type=sa.Boolean(), server_default=None)

    op.create_table(
        'paymentattempt',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('request_id', sa.Integer(), sa.ForeignKey('servicerequest.id'), nullable=False),
        sa.Column('compound_id', sa.Integer(), sa.ForeignKey('compound.id'), nullable=True),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('provider_ref', sa.String(), nullable=True),
        sa.Column('checkout_url', sa.String(), nullable=True),
        sa.Column('provider_status', sa.String(), nullable=True),
        sa.Column('note', sa.String(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_paymentattempt_request_id', 'paymentattempt', ['request_id'])
    op.create_index('ix_paymentattempt_provider_ref', 'paymentattempt', ['provider_ref'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_paymentattempt_provider_ref', table_name='paymentattempt')
    op.drop_index('ix_paymentattempt_request_id', table_name='paymentattempt')
    op.drop_table('paymentattempt')
    with op.batch_alter_table('compound') as batch:
        batch.drop_column('online_payments_enabled')
        batch.drop_column('payment_provider')
    # قيمة 'online' تبقى بنوع paymentmethod على Postgres (ما ينحذف عنصر من enum)
