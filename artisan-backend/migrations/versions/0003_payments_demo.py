"""payments demo

الدفع التجريبي: طريقة الدفع (كاش / بطاقة تجريبية) وحالته (غير مدفوع / مدفوع) ووقته بكل طلب،
ونوع إشعار جديد payment_update.

الطلبات المكتملة قبل هذا التحديث تنعلّم مدفوعة (وقت الدفع = وقت الإكمال) وبدون طريقة دفع،
لأنها خلصت قبل ما نسجل الدفع بالمنصة — حتى ما تطلع كديون بملخص المشرف والشركة.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, Sequence[str], None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_method = sa.Enum('cash', 'card_demo', name='paymentmethod')
payment_status = sa.Enum('unpaid', 'paid', name='paymentstatus')


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'payment_update'")

    payment_method.create(bind, checkfirst=True)
    payment_status.create(bind, checkfirst=True)
    with op.batch_alter_table('servicerequest', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_method', payment_method, nullable=True))
        batch_op.add_column(sa.Column('payment_status', payment_status, nullable=False, server_default='unpaid'))
        batch_op.add_column(sa.Column('paid_at', sa.DateTime(), nullable=True))
    with op.batch_alter_table('servicerequest', schema=None) as batch_op:
        batch_op.alter_column('payment_status', existing_type=payment_status, server_default=None)

    request = sa.table('servicerequest', sa.column('status', sa.String), sa.column('payment_status', sa.String),
                       sa.column('paid_at', sa.DateTime), sa.column('completed_at', sa.DateTime))
    bind.execute(request.update().where(request.c.status == 'completed')
                 .values(payment_status='paid', paid_at=request.c.completed_at))


def downgrade() -> None:
    # قيمة payment_update بنوع notificationtype بـ PostgreSQL ما تنحذف (PostgreSQL ما يدعم حذف قيم enum)
    with op.batch_alter_table('servicerequest', schema=None) as batch_op:
        batch_op.drop_column('paid_at')
        batch_op.drop_column('payment_status')
        batch_op.drop_column('payment_method')
    payment_status.drop(op.get_bind(), checkfirst=True)
    payment_method.drop(op.get_bind(), checkfirst=True)
