"""compounds and companies

تعدد المجمعات: جداول المجمع والشركة والاتفاقية، وربط المستخدمين والطلبات بيها.

البيانات الموجودة (إذا القاعدة بيها مستخدمين) تنتقل كلها لـ "مجمع البدور السكني":
السكان ومشرف المجمع والطلبات للمجمع، والحرفيين لشركة واحدة "شركة الصيانة الحالية"،
ويه اتفاقية بينهم تغطي كل الخدمات. السكان الحاليين عضويتهم مقبولة.
القاعدة الجديدة (بدون مستخدمين) ما ينضاف لها شي — seed يسوي بياناته.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-10 19:41:49.933382
"""
from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = '0002'
down_revision: Union[str, Sequence[str], None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_COMPOUND = 'مجمع البدور السكني'
DEFAULT_COMPANY = 'شركة الصيانة الحالية'

membership_status = sa.Enum('pending', 'approved', 'rejected', name='membershipstatus')


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == 'postgresql'

    # الأدوار الجديدة: بـ PostgreSQL الدور نوع enum، والإضافة له لازم تصير برّا الـ transaction.
    # بـ SQLite العمود نص عادي فما يحتاج شي.
    if is_postgres:
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'owner'")
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'company_manager'")

    op.create_table('company',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('compound',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('agreement',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('compound_id', sa.Integer(), nullable=False),
    sa.Column('company_id', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['company.id'], ),
    sa.ForeignKeyConstraint(['compound_id'], ['compound.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('compound_id', 'company_id')
    )
    with op.batch_alter_table('agreement', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_agreement_company_id'), ['company_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_agreement_compound_id'), ['compound_id'], unique=False)

    op.create_table('agreementservicelink',
    sa.Column('agreement_id', sa.Integer(), nullable=False),
    sa.Column('service_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['agreement_id'], ['agreement.id'], ),
    sa.ForeignKeyConstraint(['service_id'], ['service.id'], ),
    sa.PrimaryKeyConstraint('agreement_id', 'service_id')
    )

    # السكان الحاليين مقبولين (server_default)، والجدد ياخذون "pending" من الموديل
    membership_status.create(bind, checkfirst=True)
    with op.batch_alter_table('residentprofile', schema=None) as batch_op:
        batch_op.add_column(sa.Column('membership_status', membership_status, nullable=False, server_default='approved'))
    with op.batch_alter_table('residentprofile', schema=None) as batch_op:
        batch_op.alter_column('membership_status', existing_type=membership_status, server_default=None)

    with op.batch_alter_table('servicerequest', schema=None) as batch_op:
        batch_op.add_column(sa.Column('compound_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_servicerequest_compound_id'), ['compound_id'], unique=False)
        batch_op.create_foreign_key('fk_servicerequest_compound_id_compound', 'compound', ['compound_id'], ['id'])

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('compound_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_user_company_id'), ['company_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_compound_id'), ['compound_id'], unique=False)
        batch_op.create_foreign_key('fk_user_company_id_company', 'company', ['company_id'], ['id'])
        batch_op.create_foreign_key('fk_user_compound_id_compound', 'compound', ['compound_id'], ['id'])

    _move_existing_data(bind)


def _move_existing_data(bind) -> None:
    user = sa.table('user', sa.column('id', sa.Integer), sa.column('role', sa.String),
                    sa.column('compound_id', sa.Integer), sa.column('company_id', sa.Integer))
    if not bind.execute(sa.select(sa.func.count()).select_from(user)).scalar():
        return

    now = datetime.utcnow()
    # جداول خفيفة بنسخة هذا الـ migration (مو الموديلات الحالية)؛ id مفتاح أساسي حتى نرجع الرقم بعد الإضافة
    meta = sa.MetaData()
    compound = sa.Table('compound', meta, sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String),
                        sa.Column('is_active', sa.Boolean), sa.Column('created_at', sa.DateTime))
    company = sa.Table('company', meta, sa.Column('id', sa.Integer, primary_key=True), sa.Column('name', sa.String),
                       sa.Column('is_active', sa.Boolean), sa.Column('created_at', sa.DateTime))
    agreement = sa.Table('agreement', meta, sa.Column('id', sa.Integer, primary_key=True),
                         sa.Column('compound_id', sa.Integer), sa.Column('company_id', sa.Integer),
                         sa.Column('is_active', sa.Boolean), sa.Column('created_at', sa.DateTime))
    link = sa.table('agreementservicelink', sa.column('agreement_id', sa.Integer), sa.column('service_id', sa.Integer))
    service = sa.table('service', sa.column('id', sa.Integer))
    request = sa.table('servicerequest', sa.column('compound_id', sa.Integer))

    compound_id = bind.execute(compound.insert().values(
        name=DEFAULT_COMPOUND, is_active=True, created_at=now)).inserted_primary_key[0]
    company_id = bind.execute(company.insert().values(
        name=DEFAULT_COMPANY, is_active=True, created_at=now)).inserted_primary_key[0]
    agreement_id = bind.execute(agreement.insert().values(
        compound_id=compound_id, company_id=company_id, is_active=True, created_at=now)).inserted_primary_key[0]

    service_ids = [row[0] for row in bind.execute(sa.select(service.c.id))]
    if service_ids:
        bind.execute(link.insert(), [{'agreement_id': agreement_id, 'service_id': sid} for sid in service_ids])

    bind.execute(user.update().where(user.c.role.in_(['customer', 'admin'])).values(compound_id=compound_id))
    bind.execute(user.update().where(user.c.role == 'artisan').values(company_id=company_id))
    bind.execute(request.update().values(compound_id=compound_id))


def downgrade() -> None:
    # الأدوار المضافة لنوع userrole بـ PostgreSQL ما تنحذف (PostgreSQL ما يدعم حذف قيم enum)
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint('fk_user_compound_id_compound', type_='foreignkey')
        batch_op.drop_constraint('fk_user_company_id_company', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_user_compound_id'))
        batch_op.drop_index(batch_op.f('ix_user_company_id'))
        batch_op.drop_column('company_id')
        batch_op.drop_column('compound_id')

    with op.batch_alter_table('servicerequest', schema=None) as batch_op:
        batch_op.drop_constraint('fk_servicerequest_compound_id_compound', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_servicerequest_compound_id'))
        batch_op.drop_column('compound_id')

    with op.batch_alter_table('residentprofile', schema=None) as batch_op:
        batch_op.drop_column('membership_status')
    membership_status.drop(op.get_bind(), checkfirst=True)

    op.drop_table('agreementservicelink')
    with op.batch_alter_table('agreement', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_agreement_compound_id'))
        batch_op.drop_index(batch_op.f('ix_agreement_company_id'))

    op.drop_table('agreement')
    op.drop_table('compound')
    op.drop_table('company')
