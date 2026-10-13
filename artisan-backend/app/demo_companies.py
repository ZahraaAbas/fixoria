"""
تقسيم شركة الصيانة التجريبية لشركات متخصصة (مرة وحدة، وقت تشغيل الخادم).

البيانات التجريبية الأولى عملت شركة وحدة ("شركة الصيانة الحالية") تغطي كل الخدمات وبيها كل الحرفيين.
هنا نقسّمها حسب التخصص، وكل شركة إلها اتفاقية ويا مجمع البدور بخدماتها:

    كهرباء             -> نفس الشركة الأصلية بعد تغيير اسمها "شركة النور للكهرباء" (حتى حساب مديرها يبقى يشتغل)
    سباكة              -> شركة الينبوع للسباكة
    تكييف وتبريد       -> شركة النسيم للتكييف والتبريد
    نجارة، دهان وديكور -> شركة الإتقان للنجارة والدهان
    تنظيف              -> شركة اللمعة للتنظيف

كل حرفي ينتقل لشركة تخصصه الأساسي. الطلبات وسجلها ما تنمسح.
يشتغل بس إذا لگى البيانات التجريبية بالضبط (مجمع البدور + الشركة الأصلية تغطي أكثر من خدمة + حساب
customer@demo.com)، فأي إعداد حقيقي ما ينلمس، وبعد التقسيم ما يتكرر (الاسم الأصلي يتغير).
"""
import logging
import secrets

from sqlmodel import Session, select

from app.auth import hash_password
from app.database import engine
from app.models import (
    Agreement, AgreementServiceLink, Artisan, ArtisanServiceLink, Company, Compound, RequestStatus, Service,
    ServiceRequest, User, UserRole,
)

logger = logging.getLogger(__name__)

DEMO_COMPOUND = "مجمع البدور السكني"
DEMO_COMPANY = "شركة الصيانة الحالية"
KEEP_SERVICE = "كهرباء"
KEEP_NAME = "شركة النور للكهرباء"
SPLIT = [
    ("شركة الينبوع للسباكة", ["سباكة"]),
    ("شركة النسيم للتكييف والتبريد", ["تكييف وتبريد"]),
    ("شركة الإتقان للنجارة والدهان", ["نجارة", "دهان وديكور"]),
    ("شركة اللمعة للتنظيف", ["تنظيف"]),
]

# شركة ما طلعلها حرفي (ماكو حرفي تجريبي تخصصه الأساسي خدمتها): نضيفلها حرفيين تجريبيين
# بكلمة سر عشوائية (للعرض بس، ما ينفع الدخول بيهم)
EXTRA_ARTISANS = {
    "تنظيف": [("زينب علي", "07805550111"), ("نور حسين", "07805550112")],
}


def split_demo_companies() -> bool:
    # هاي بس ترتيب للبيانات التجريبية: إذا فشلت ما نوقف تشغيل الخادم (الـ session يتراجع لحاله)
    try:
        with Session(engine) as session:
            return _split(session)
    except Exception:
        logger.exception("ما انقسمت شركة الصيانة التجريبية")
        return False


def _split(session: Session) -> bool:
    compound = session.exec(select(Compound).where(Compound.name == DEMO_COMPOUND)).first()
    original = session.exec(select(Company).where(Company.name == DEMO_COMPANY)).first()
    demo_marker = session.exec(select(User).where(User.email == "customer@demo.com")).first()
    if not compound or not original or not demo_marker:
        return False
    agreement = session.exec(
        select(Agreement).where(Agreement.compound_id == compound.id, Agreement.company_id == original.id,
                                Agreement.is_active == True)  # noqa: E712
    ).first()
    if not agreement:
        return False
    links = session.exec(select(AgreementServiceLink).where(AgreementServiceLink.agreement_id == agreement.id)).all()
    if len(links) <= 1:
        return False

    services = {s.name: s for s in session.exec(select(Service)).all()}
    keep = services.get(KEEP_SERVICE)
    if not keep:
        return False

    # 1) الشركة الأصلية تصير شركة الكهرباء وتبقى اتفاقيتها على الكهرباء بس
    original.name = KEEP_NAME
    session.add(original)
    for link in links:
        if link.service_id != keep.id:
            session.delete(link)

    # 2) الشركات المتخصصة الجديدة واتفاقياتها
    company_for_service = {keep.id: original.id}
    for name, service_names in SPLIT:
        service_ids = [services[n].id for n in service_names if n in services]
        if not service_ids:
            continue
        company = session.exec(select(Company).where(Company.name == name)).first()
        if not company:
            company = Company(name=name)
            session.add(company)
            session.flush()
        # الشركة ممكن تكون موجودة من قبل وإلها اتفاقية ويا المجمع: نستخدمها ونضيف الناقص بس
        company_agreement = session.exec(
            select(Agreement).where(Agreement.compound_id == compound.id, Agreement.company_id == company.id)
        ).first()
        if not company_agreement:
            company_agreement = Agreement(compound_id=compound.id, company_id=company.id)
        company_agreement.is_active = True
        session.add(company_agreement)
        session.flush()
        existing = set(session.exec(
            select(AgreementServiceLink.service_id).where(AgreementServiceLink.agreement_id == company_agreement.id)
        ).all())
        for sid in service_ids:
            if sid not in existing:
                session.add(AgreementServiceLink(agreement_id=company_agreement.id, service_id=sid))
            company_for_service[sid] = company.id

    # 3) كل حرفي لشركة تخصصه الأساسي
    moved = 0
    for artisan, user in session.exec(
        select(Artisan, User).join(User, User.id == Artisan.user_id).where(User.company_id == original.id)
    ).all():
        target = company_for_service.get(artisan.service_id)
        if target and target != original.id:
            user.company_id = target
            session.add(user)
            moved += 1

    # 3ب) شركة بقت بدون حرفيين: حرفيين تجريبيين لخدمتها
    for name, service_names in SPLIT:
        company = session.exec(select(Company).where(Company.name == name)).first()
        if not company:
            continue
        has_artisans = session.exec(select(User.id).where(User.company_id == company.id, User.role == UserRole.artisan)).first()
        if has_artisans:
            continue
        for service_name in service_names:
            service = services.get(service_name)
            for index, (full_name, phone) in enumerate(EXTRA_ARTISANS.get(service_name, []), start=1):
                email = f"{phone}@demo.com"
                if session.exec(select(User).where(User.email == email)).first():
                    continue
                user = User(name=full_name, email=email, password_hash=hash_password(secrets.token_urlsafe(32)),
                            role=UserRole.artisan, company_id=company.id)
                session.add(user)
                session.flush()
                artisan = Artisan(user_id=user.id, service_id=service.id, phone=phone, specialty=service.name,
                                  verified=True)
                session.add(artisan)
                session.flush()
                session.add(ArtisanServiceLink(artisan_id=artisan.id, service_id=service.id))
                moved += 1

    # 4) طلبات موجّهة للشركة الأصلية بخدمة ما بقت عندها: ترجع مفتوحة بدون توجيه
    for req in session.exec(
        select(ServiceRequest).where(ServiceRequest.company_id == original.id, ServiceRequest.status == RequestStatus.pending)
    ).all():
        if req.service_id != keep.id and req.artisan_id is None:
            req.company_id = None
            req.dispatch_deadline = None
            session.add(req)

    session.commit()
    logger.info("انقسمت شركة الصيانة التجريبية لشركات متخصصة (%s حرفي انتقلوا)", moved)
    return True
