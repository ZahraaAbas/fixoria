"""status history and sign-up dates

سجل حالات الطلب (جدول requestevent) + وقت القبول ووقت بدء التنفيذ بكل طلب + تاريخ تسجيل المستخدم.

ما نعبّي بيانات قديمة: الطلبات والحسابات الي قبل هذا التحديث ما نعرف وقت قبولها أو تسجيلها،
فتبقى فاضية (الواجهة تعرض الإنشاء والإكمال المعروفين بس، وتقول إن السجل بدأ من هالتحديث).

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0004'
down_revision: Union[str, Sequence[str], None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('user') as batch:
        batch.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))

    with op.batch_alter_table('servicerequest') as batch:
        batch.add_column(sa.Column('accepted_at', sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('started_at', sa.DateTime(), nullable=True))

    op.create_table(
        'requestevent',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('request_id', sa.Integer(), sa.ForeignKey('servicerequest.id'), nullable=False),
        sa.Column('kind', sa.String(), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('actor_role', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_requestevent_request_id', 'requestevent', ['request_id'])


def downgrade() -> None:
    op.drop_index('ix_requestevent_request_id', table_name='requestevent')
    op.drop_table('requestevent')
    with op.batch_alter_table('servicerequest') as batch:
        batch.drop_column('started_at')
        batch.drop_column('accepted_at')
    with op.batch_alter_table('user') as batch:
        batch.drop_column('created_at')
