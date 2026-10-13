"""dispatch modes

طريقة توزيع الطلبات لكل شركة صيانة:
- company.dispatch_mode: open (الحرفيين يقبلون مباشرة، الافتراضي) / company (المدير يوزّع)
- company.dispatch_minutes: مهلة التوزيع، بعدها الطلب ينفتح لحرفيي الشركة
- servicerequest.company_id + dispatch_deadline: الشركة الي توزّع الطلب ومهلتها

كل الشركات الحالية تبقى "open"، فما يتغير شي لحد ما الشركة تختار.

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, Sequence[str], None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('company') as batch:
        batch.add_column(sa.Column('dispatch_mode', sa.String(), nullable=False, server_default='open'))
        batch.add_column(sa.Column('dispatch_minutes', sa.Integer(), nullable=False, server_default='30'))
    with op.batch_alter_table('company') as batch:
        batch.alter_column('dispatch_mode', existing_type=sa.String(), server_default=None)
        batch.alter_column('dispatch_minutes', existing_type=sa.Integer(), server_default=None)

    with op.batch_alter_table('servicerequest') as batch:
        batch.add_column(sa.Column('company_id', sa.Integer(), sa.ForeignKey('company.id', name='fk_servicerequest_company_id'), nullable=True))
        batch.add_column(sa.Column('dispatch_deadline', sa.DateTime(), nullable=True))
        batch.create_index('ix_servicerequest_company_id', ['company_id'])


def downgrade() -> None:
    with op.batch_alter_table('servicerequest') as batch:
        batch.drop_index('ix_servicerequest_company_id')
        batch.drop_constraint('fk_servicerequest_company_id', type_='foreignkey')
        batch.drop_column('dispatch_deadline')
        batch.drop_column('company_id')
    with op.batch_alter_table('company') as batch:
        batch.drop_column('dispatch_minutes')
        batch.drop_column('dispatch_mode')
