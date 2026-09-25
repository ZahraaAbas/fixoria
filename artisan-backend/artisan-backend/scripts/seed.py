"""
تعبئة بيانات تجريبية للعرض — تشغيل مرة وحدة:
    python -m scripts.seed

تسوي:
- حساب Admin
- حساب Customer
- حسابين Artisan (كهرباء + سباكة) verified
- خدمتين (كهرباء / سباكة)
- طلب مكتمل + تقييم لكل حرفي (وحد عالي وحد واطي) — عشان خانة الداشبورد تبين بيانات حقيقية

إضافات لوحة الساكن:
- ملف ساكن كامل (علي حسين — B-204 — البناية B الطابق 2 — مشترك)
- 4 أنواع خدمات (كهرباء / سباكة / تكييف وتبريد / نجارة عامة) و3 حرفيين لكل نوع مع تقييمات
- طلبات حالية بمواعيد، سجل مكتمل بأسعار وتقييمات، طلب مرفوض بسبب، طلب ينتظر تقييم
- إشعارات (3 غير مقروءة) + شكوى نموذجية

إضافات ربط الفرونت الجديد (finalize_for_frontend):
- أسماء الخدمات مطابقة لتصنيفات الفرونت الستة: كهرباء، سباكة، تكييف وتبريد، نجارة، دهان وديكور، تنظيف
- ربط كل حرفي بخدماته (ArtisanServiceLink) + عنوان وبناية لكل طلب
- طلبات مفتوحة (بدون حرفي) تظهر للحرفيين بصفحة "الطلبات المتاحة"
- حرفي بانتظار التوثيق (pending@demo.com) لتجربة صفحة موافقة الإدارة
- طلب ملغي من الساكن
"""
import sys
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.database import engine, create_db_and_tables
from app.models import (
    User, Artisan, Service, ServiceRequest, Review, RequestStatus, UserRole,
    ResidentProfile, Notification, NotificationType, Complaint, ArtisanServiceLink,
)
from app.auth import hash_password

DEMO_PASSWORD = "Passw0rd!"


def months_ago(n: int, day: int = 15) -> datetime:
    """تاريخ بنفس اليوم (افتراضياً 15) قبل n شهر من الحين — لتفادي مشاكل اختلاف عدد أيام الشهر."""
    ref = datetime.utcnow()
    year, month = ref.year, ref.month
    for _ in range(n):
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return datetime(year, month, day, 10, 0, 0)


def seed() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        if session.exec(select(User)).first():
            print("القاعدة عندها بيانات مسبقاً — ما رح نكرر التعبئة.")
            return

        admin = User(
            name="Admin",
            email="admin@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
            role=UserRole.admin,
        )
        customer = User(
            name="علي حسين",
            email="customer@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
            role=UserRole.customer,
        )
        electrician_user = User(
            name="كريم محمد",
            email="artisan@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
            role=UserRole.artisan,
        )
        plumber_user = User(
            name="سارة احمد",
            email="plumber@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
            role=UserRole.artisan,
        )
        session.add_all([admin, customer, electrician_user, plumber_user])
        session.commit()
        session.refresh(electrician_user)
        session.refresh(plumber_user)
        session.refresh(customer)

        electrician = Artisan(
            user_id=electrician_user.id,
            phone="07701234567",
            specialty="كهرباء",
            description="صيانة وتمديدات كهربائية",
            location="مجمع الأندلس",
            verified=True,
        )
        plumber = Artisan(
            user_id=plumber_user.id,
            phone="07709876543",
            specialty="سباكة",
            description="صيانة سباكة وتسريبات مياه",
            location="مجمع الأندلس",
            verified=True,
        )
        electricity_service = Service(name="صيانة كهربائية", description="إصلاح أعطال ولوحات كهرباء", icon="zap")
        plumbing_service = Service(name="سباكة", description="تسريبات وإصلاح مواسير", icon="droplet")
        ac_service = Service(name="تكييف وتبريد", description="صيانة وتنظيف وتعبئة غاز المكيفات", icon="snowflake")
        carpentry_service = Service(name="نجارة عامة", description="أبواب وشبابيك وأثاث", icon="hammer")
        session.add_all([electricity_service, plumbing_service, ac_service, carpentry_service])
        session.commit()
        for s in (electricity_service, plumbing_service, ac_service, carpentry_service):
            session.refresh(s)

        electrician.service_id = electricity_service.id
        plumber.service_id = plumbing_service.id
        session.add_all([electrician, plumber])
        session.commit()
        session.refresh(electrician)
        session.refresh(plumber)

        # طلب مكتمل + تقييم عالي (كهرباء)
        req1 = ServiceRequest(
            customer_id=customer.id,
            artisan_id=electrician.id,
            service_id=electricity_service.id,
            description="عطل بلوحة الكهرباء الرئيسية",
            location="بناية 3 - شقة 12",
            status=RequestStatus.completed,
            created_at=datetime.utcnow() - timedelta(days=3),
            completed_at=datetime.utcnow() - timedelta(days=3) + timedelta(hours=4),
            price=60000,
        )
        # طلب مكتمل + تقييم واطي (سباكة) — عشان نشوف تنبيه "below_average" شغال
        req2 = ServiceRequest(
            customer_id=customer.id,
            artisan_id=plumber.id,
            service_id=plumbing_service.id,
            description="تسريب مي بالمطبخ",
            location="بناية 3 - شقة 12",
            status=RequestStatus.completed,
            created_at=datetime.utcnow() - timedelta(days=2),
            completed_at=datetime.utcnow() - timedelta(days=2) + timedelta(hours=3),
            price=55000,
        )
        session.add_all([req1, req2])
        session.commit()
        session.refresh(req1)
        session.refresh(req2)

        # طلبين إضافيين بمراحل مختلفة — عشان شريط التقدّم يبين تنوع حقيقي بالعرض
        req3 = ServiceRequest(
            customer_id=customer.id,
            artisan_id=electrician.id,
            service_id=electricity_service.id,
            description="تركيب إنارة بالحديقة المشتركة",
            location="بناية 1 - المدخل الرئيسي",
            status=RequestStatus.accepted,  # في الطريق اليك
            created_at=datetime.utcnow() - timedelta(hours=5),
            scheduled_at=datetime.utcnow() + timedelta(days=1, hours=2),
        )
        req4 = ServiceRequest(
            customer_id=customer.id,
            artisan_id=plumber.id,
            service_id=plumbing_service.id,
            description="فحص ضغط المي بالخزان",
            location="بناية 2 - السطح",
            status=RequestStatus.in_progress,  # يتم تنفيذ العملية
            created_at=datetime.utcnow() - timedelta(hours=2),
            scheduled_at=datetime.utcnow() + timedelta(hours=1),
        )
        session.add_all([req3, req4])
        session.commit()
        session.refresh(req3)
        session.refresh(req4)

        # طلبات تاريخية موزّعة على أشهر وبنايات مختلفة — عشان الرسوم البيانية
        # (نشاط الحرفي بالأدمن، وخط الطلبات حسب البناية بالحرفي) تبين بيانات حقيقية.
        # بناية 4 توقفت عن إرسال طلبات آخر شهرين — مثال حي على التنبيه المطلوب.
        historical = [
            (electrician.id, electricity_service.id, "بناية 1 - شقة 4", 5),
            (electrician.id, electricity_service.id, "بناية 1 - شقة 7", 4),
            (electrician.id, electricity_service.id, "بناية 4 - شقة 2", 4),
            (electrician.id, electricity_service.id, "بناية 4 - شقة 9", 3),
            (electrician.id, electricity_service.id, "بناية 1 - شقة 2", 2),
            (electrician.id, electricity_service.id, "بناية 1 - شقة 5", 1),
            (plumber.id, plumbing_service.id, "بناية 2 - شقة 3", 4),
            (plumber.id, plumbing_service.id, "بناية 2 - شقة 6", 3),
            (plumber.id, plumbing_service.id, "بناية 3 - شقة 1", 2),
            (plumber.id, plumbing_service.id, "بناية 2 - شقة 8", 1),
        ]
        historical_reqs = []
        for artisan_id, service_id, location, months_back in historical:
            hr = ServiceRequest(
                customer_id=customer.id,
                artisan_id=artisan_id,
                service_id=service_id,
                description="طلب تجريبي لأغراض الرسم البياني",
                location=location,
                status=RequestStatus.completed,
                created_at=months_ago(months_back),
                completed_at=months_ago(months_back) + timedelta(hours=5),
                price=50000,
            )
            session.add(hr)
            historical_reqs.append(hr)
        session.commit()
        for hr in historical_reqs:
            session.refresh(hr)

        review1 = Review(
            customer_id=customer.id,
            artisan_id=electrician.id,
            request_id=req1.id,
            rating=5,
            comment="شغل ممتاز وسريع",
        )
        review2 = Review(
            customer_id=customer.id,
            artisan_id=plumber.id,
            request_id=req2.id,
            rating=2,
            comment="تأخر بالوصول والمشكلة رجعت بعد يومين",
        )
        session.add_all([review1, review2])
        session.commit()

        seed_resident_dashboard(
            session, customer, electrician, plumber,
            electricity_service, plumbing_service, ac_service, carpentry_service,
            req3, historical_reqs,
        )

        finalize_for_frontend(session)

        print("تم إنشاء بيانات تجريبية:")
        print(f"  Admin:    admin@demo.com / {DEMO_PASSWORD}")
        print(f"  Customer: customer@demo.com / {DEMO_PASSWORD}")
        print(f"  Artisan (كهرباء): artisan@demo.com / {DEMO_PASSWORD}")
        print(f"  Artisan (سباكة):  plumber@demo.com / {DEMO_PASSWORD}")
        print("  جرّبي GET /admin/services/stats بعد تسجيل دخول الأدمن — راح تشوفين")
        print("  خدمة السباكة معلّمة below_average مع السبب.")
        print(f"  Resident 2 (جار): neighbor@demo.com / {DEMO_PASSWORD}")
        print("  لوحة الساكن: سجلي دخول بـ customer@demo.com وجربي GET /resident/dashboard")
        print(f"  Artisan بانتظار التوثيق: pending@demo.com / {DEMO_PASSWORD}")


# ---------------------------------------------------------------------
# بيانات لوحة الساكن
# ---------------------------------------------------------------------

EXTRA_ARTISANS = {
    # service_key: [(name, email, ratings_from_neighbor)]
    "electricity": [
        ("علي ستار", "ali.sattar@demo.com", [5, 4, 5]),
        ("محمد قاسم", "m.qasim@demo.com", [5, 4, 5, 4, 5]),
    ],
    "plumbing": [
        ("مؤيد حسن", "muayad@demo.com", [4, 5, 4, 4]),
        ("بشار وليد", "bashar@demo.com", [4, 4, 5, 4]),
    ],
    "ac": [
        ("أحمد سامي", "ahmed.sami@demo.com", [5, 5, 4, 5]),
        ("محمد ليث", "m.laith@demo.com", [4, 5, 4, 5]),
        ("عمار ياسين", "ammar@demo.com", [4, 5, 4, 4]),
    ],
    "carpentry": [
        ("حيدر علي", "haider@demo.com", [5, 4, 5]),
        ("كريم محمود", "karim.mahmoud@demo.com", [4, 5, 4]),
        ("سجاد كريم", "sajjad@demo.com", [4, 4, 5, 4]),
    ],
}

SPECIALTY_AR = {
    "electricity": "كهرباء",
    "plumbing": "سباكة",
    "ac": "تكييف وتبريد",
    "carpentry": "نجارة",
}


def seed_resident_dashboard(
    session, customer, electrician, plumber,
    electricity_service, plumbing_service, ac_service, carpentry_service,
    req3, historical_reqs,
):
    now = datetime.utcnow()
    services = {
        "electricity": electricity_service,
        "plumbing": plumbing_service,
        "ac": ac_service,
        "carpentry": carpentry_service,
    }

    # --- ملف الساكن الرئيسي (مشترك — يكدر يختار الحرفي) ---
    session.add(ResidentProfile(
        user_id=customer.id,
        phone="0770 123 4567",
        whatsapp="0770 123 4567",
        apartment_number="B-204",
        building="البناية B",
        floor="2",
        is_subscriber=True,
    ))

    # --- جار (ساكن ثاني) — تقييماته تعبي تقييمات الحرفيين بكروت الخدمات ---
    neighbor = User(
        name="حسن كاظم",
        email="neighbor@demo.com",
        password_hash=hash_password(DEMO_PASSWORD),
        role=UserRole.customer,
    )
    session.add(neighbor)
    session.commit()
    session.refresh(neighbor)
    session.add(ResidentProfile(
        user_id=neighbor.id, phone="0780 555 1122", apartment_number="A-101",
        building="البناية A", floor="1",
    ))

    # --- الحرفيين الإضافيين + طلبات مكتملة مقيّمة من الجار ---
    artisans_by_name = {"كريم محمد": electrician, "سارة احمد": plumber}
    for key, rows in EXTRA_ARTISANS.items():
        service = services[key]
        for i, (name, email, ratings) in enumerate(rows):
            u = User(name=name, email=email,
                     password_hash=hash_password(DEMO_PASSWORD), role=UserRole.artisan)
            session.add(u)
            session.commit()
            session.refresh(u)
            a = Artisan(
                user_id=u.id, service_id=service.id, phone=f"0771000{len(artisans_by_name):04d}",
                specialty=SPECIALTY_AR[key], location="مجمع الأندلس", verified=True,
            )
            session.add(a)
            session.commit()
            session.refresh(a)
            artisans_by_name[name] = a

            for j, rating in enumerate(ratings):
                created = months_ago(j + 1, day=5 + i)
                r = ServiceRequest(
                    customer_id=neighbor.id, artisan_id=a.id, service_id=service.id,
                    description=f"{service.name} — طلب سابق",
                    location="البناية A - A-101", status=RequestStatus.completed,
                    created_at=created, completed_at=created + timedelta(hours=3),
                    price=40000 + 5000 * j,
                )
                session.add(r)
                session.commit()
                session.refresh(r)
                session.add(Review(customer_id=neighbor.id, artisan_id=a.id,
                                   request_id=r.id, rating=rating))
    session.commit()

    # --- تقييمات الساكن الرئيسي على طلباته التاريخية (المجموع 9 مع التقييمين السابقين) ---
    # historical_reqs بنفس ترتيب قائمة historical: أول 6 كهرباء، آخر 4 سباكة
    customer_ratings = [(0, 5, "ممتاز"), (1, 4, None), (2, 5, None), (3, 5, "سريع ومرتب"),
                        (6, 3, None), (7, 4, None), (8, 5, "حل المشكلة من أول مرة")]
    for idx, rating, comment in customer_ratings:
        hr = historical_reqs[idx]
        session.add(Review(customer_id=customer.id, artisan_id=hr.artisan_id,
                           request_id=hr.id, rating=rating, comment=comment))
    session.commit()

    # --- طلب مكتمل حديث بدون تقييم -> نافذة "قيم خدمتك" ---
    haider = artisans_by_name["حيدر علي"]
    to_review = ServiceRequest(
        customer_id=customer.id, artisan_id=haider.id, service_id=carpentry_service.id,
        description="تصليح باب غرفة النوم", location="البناية B - B-204", unit_number="B-204",
        contact_name=customer.name, status=RequestStatus.completed,
        created_at=now - timedelta(days=1, hours=6), scheduled_at=now - timedelta(days=1),
        completed_at=now - timedelta(hours=20), price=75000,
    )

    # --- طلب حالي بانتظار القبول (تكييف — أحمد سامي) ---
    ac_pending = ServiceRequest(
        customer_id=customer.id, artisan_id=artisans_by_name["أحمد سامي"].id,
        service_id=ac_service.id, description="المكيف ما يبرد",
        location="البناية B - B-204", unit_number="B-204", contact_name=customer.name,
        status=RequestStatus.pending, created_at=now - timedelta(hours=2),
        scheduled_at=now + timedelta(days=2, hours=3),
    )

    # --- طلب مرفوض بسبب ---
    rejected = ServiceRequest(
        customer_id=customer.id, artisan_id=artisans_by_name["مؤيد حسن"].id,
        service_id=plumbing_service.id, description="تبديل حنفية المغسلة",
        location="البناية B - B-204", unit_number="B-204", contact_name=customer.name,
        status=RequestStatus.rejected, rejection_reason="غير متاح في هذا الوقت",
        created_at=now - timedelta(hours=3),
    )
    session.add_all([to_review, ac_pending, rejected])
    session.commit()
    for r in (to_review, ac_pending, rejected):
        session.refresh(r)

    # --- الإشعارات (3 غير مقروءة مثل الصورة + قديمة مقروءة) ---
    session.add_all([
        Notification(user_id=customer.id, request_id=ac_pending.id,
                     type=NotificationType.request_received,
                     title=f"تم استلام طلبك رقم #{ac_pending.id}",
                     body="جاري البحث عن حرفي مناسب", created_at=now - timedelta(hours=2)),
        Notification(user_id=customer.id, request_id=rejected.id,
                     type=NotificationType.request_rejected,
                     title=f"تم رفض طلبك رقم #{rejected.id}",
                     body="السبب: غير متاح في هذا الوقت", created_at=now - timedelta(hours=1)),
        Notification(user_id=customer.id, request_id=req3.id,
                     type=NotificationType.request_accepted,
                     title=f"تم قبول طلبك رقم #{req3.id}",
                     body="من قبل الحرفي كريم محمد", created_at=now - timedelta(minutes=5)),
        Notification(user_id=customer.id, request_id=to_review.id,
                     type=NotificationType.request_completed, is_read=True,
                     title=f"تم إكمال طلبك رقم #{to_review.id}",
                     body="قيّم تجربتك مع الحرفي حيدر علي", created_at=now - timedelta(hours=20)),
    ])

    # --- شكوى نموذجية ---
    session.add(Complaint(
        customer_id=customer.id, subject="تأخر الحرفي بالوصول",
        message="الحرفي وصل بعد الموعد بساعتين بدون ما يبلغني.",
        created_at=now - timedelta(days=4),
    ))
    session.commit()


# ---------------------------------------------------------------------
# مطابقة البيانات مع الفرونت (fixoria)
# ---------------------------------------------------------------------

SERVICE_RENAMES = {"صيانة كهربائية": "كهرباء", "نجارة عامة": "نجارة"}
EXTRA_SERVICES = [
    ("دهان وديكور", "دهان جدران وديكورات داخلية", "paintbrush"),
    ("تنظيف", "تنظيف شقق وخزانات وسجاد", "sparkles"),
]


def finalize_for_frontend(session):
    now = datetime.utcnow()

    # 1) أسماء الخدمات = تصنيفات الفرونت
    services = {s.name: s for s in session.exec(select(Service)).all()}
    for old, new in SERVICE_RENAMES.items():
        if old in services:
            services[old].name = new
            session.add(services[old])
    for name, desc, icon in EXTRA_SERVICES:
        session.add(Service(name=name, description=desc, icon=icon))
    session.commit()
    services = {s.name: s for s in session.exec(select(Service)).all()}

    # 2) روابط حرفي ↔ خدمة + التخصص بنفس اسم الخدمة
    for artisan in session.exec(select(Artisan)).all():
        if artisan.service_id:
            session.add(ArtisanServiceLink(artisan_id=artisan.id, service_id=artisan.service_id))
            artisan.specialty = session.get(Service, artisan.service_id).name
            session.add(artisan)
    # كريم (كهرباء) يشتغل تكييف هم — مثال على حرفي بأكثر من خدمة
    karim = session.exec(select(User).where(User.email == "artisan@demo.com")).first()
    karim_artisan = session.exec(select(Artisan).where(Artisan.user_id == karim.id)).first()
    session.add(ArtisanServiceLink(artisan_id=karim_artisan.id, service_id=services["تكييف وتبريد"].id))
    karim_artisan.specialty = "كهرباء، تكييف وتبريد"
    session.add(karim_artisan)

    # 3) عنوان وبناية لكل طلب
    for req in session.exec(select(ServiceRequest)).all():
        service = session.get(Service, req.service_id)
        if not req.title:
            req.title = req.description if req.description and len(req.description) <= 40 else service.name
        if not req.building and req.location:
            req.building = req.location.split(" - ")[0].strip()
        if not req.unit_number and req.location and " - " in req.location:
            req.unit_number = req.location.split(" - ", 1)[1].strip()
        session.add(req)
    session.commit()

    customer = session.exec(select(User).where(User.email == "customer@demo.com")).first()
    neighbor = session.exec(select(User).where(User.email == "neighbor@demo.com")).first()

    # 4) طلبات مفتوحة (بدون حرفي) — تظهر لكل حرفيي الخدمة بـ "الطلبات المتاحة"
    open_requests = [
        (neighbor, "كهرباء", "انقطاع كهرباء بغرفة النوم", "القاطع يطفي كل ما نشغل المكيف", "البناية A", "A-101", 1),
        (customer, "تكييف وتبريد", "صيانة دورية للمكيف", "تنظيف فلاتر وفحص الغاز قبل الصيف", "البناية B", "B-204", 3),
        (neighbor, "دهان وديكور", "دهان غرفة الأطفال", "غرفة 4×4 لون فاتح", "البناية A", "A-101", 5),
    ]
    for owner, service_name, title, desc, building, unit, days in open_requests:
        req = ServiceRequest(
            customer_id=owner.id, service_id=services[service_name].id, artisan_id=None,
            title=title, description=desc, building=building, unit_number=unit,
            location=f"{building} - {unit}", contact_name=owner.name,
            status=RequestStatus.pending, created_at=now - timedelta(hours=2 * days),
            scheduled_at=now + timedelta(days=days, hours=3),
        )
        session.add(req)

    # 5) طلب ملغي
    session.add(ServiceRequest(
        customer_id=customer.id, service_id=services["تنظيف"].id,
        title="تنظيف الخزان", description="تنظيف خزان المي على السطح",
        building="البناية B", unit_number="B-204", location="البناية B - B-204",
        contact_name=customer.name, status=RequestStatus.cancelled,
        created_at=now - timedelta(days=6),
    ))

    # 6) حرفي بانتظار التوثيق
    pending_user = User(name="ياسر عادل", email="pending@demo.com",
                        password_hash=hash_password(DEMO_PASSWORD), role=UserRole.artisan)
    session.add(pending_user)
    session.commit()
    session.refresh(pending_user)
    pending_artisan = Artisan(
        user_id=pending_user.id, phone="07712223344", specialty="دهان وديكور، تنظيف",
        description="دهانات حديثة وديكورات جبس بخبرة 8 سنوات",
        service_id=services["دهان وديكور"].id, verified=False,
    )
    session.add(pending_artisan)
    session.commit()
    session.refresh(pending_artisan)
    for name in ("دهان وديكور", "تنظيف"):
        session.add(ArtisanServiceLink(artisan_id=pending_artisan.id, service_id=services[name].id))
    session.commit()


if __name__ == "__main__":
    seed()
