# Artisan Management — Backend (FastAPI + SQLModel)

هذا سكيلتون الباكند حسب خطة الهاكثون (Day 1: Foundation).

## التشغيل

```bash
python -m venv venv
source venv/bin/activate      # على ويندوز: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env          # وعدّلي SECRET_KEY لو حبيتي

uvicorn app.main:app --reload
```

بعدها افتحي: http://127.0.0.1:8000/docs (Swagger UI تلقائي من FastAPI)

## تعبئة بيانات تجريبية (لعرض سريع)

```bash
python -m scripts.seed
```

يسوي 3 حسابات (كلمة مرور الكل: `Passw0rd!`):
- `admin@demo.com` — Admin
- `customer@demo.com` — Customer
- `artisan@demo.com` — Artisan (verified مسبقاً) + خدمة "صيانة كهربائية"

## هيكلية المشروع

```
app/
  main.py           # نقطة الدخول + CORS + تسجيل الروترات
  database.py        # اتصال SQLite + get_session dependency
  models.py           # User, Artisan, Service, ServiceRequest, Review (SQLModel)
  schemas.py          # Pydantic schemas لل input/output
  auth.py             # hashing + JWT + get_current_user + require_role
  routers/
    auth_router.py       # /auth/register, /auth/login
    artisans_router.py   # list/search, my profile (me), details, create profile, update profile
    services_router.py   # list services, create service (admin)
    requests_router.py   # create request, list by role, details, status transitions + progress bar
    reviews_router.py    # create review, list artisan reviews
    admin_router.py      # list artisans, verify artisan, dashboard stats, requests monitoring, complaints, assign
    resident_router.py   # لوحة الساكن كاملة (/resident/*)
    notifications_router.py  # الإشعارات لكل الأدوار (/notifications)
  notifications.py    # helper: notify() — ينادى عند كل تغيير حالة
  storage.py          # حفظ الصور المرفوعة بـ ./uploads (تنخدم على /uploads/...)
scripts/
  seed.py             # بيانات تجريبية جاهزة للعرض
```

## شنو خلص (Day 1-3)

- [x] FastAPI project + SQLModel models الخمسة
- [x] اتصال قاعدة البيانات (SQLite, قابل للتبديل عبر `.env`)
- [x] Auth كامل: hashing، JWT، `/auth/register`، `/auth/login`، `require_role()`
- [x] Artisans API: بحث/فلترة، تفاصيل، إنشاء/تعديل الملف الشخصي (بحماية الدور والمالك)
- [x] **`GET /artisans/me`**: يرجع الملف الشخصي للحرفي المسجّل دخوله (بدون ما يحتاج يعرف الـ id
      مالته) — تستخدمه لوحة تحكم الحرفي
- [x] Services API: عرض + إنشاء (Admin فقط)
- [x] Requests API: إنشاء طلب، عرض حسب الدور، تفاصيل، تحديث الحالة (بقواعد انتقال محددة:
      pending→accepted/rejected→in_progress→completed)
- [x] Reviews API: تقييم بعد completed فقط، مرة وحدة بالطلب، عرض تقييمات الحرفي
- [x] Admin API: عرض الحرفيين (فلترة verified)، اعتماد/رفض الحرفي
- [x] Admin Dashboard: `GET /admin/stats` (نظرة عامة) + `GET /admin/services/stats` (تراكنك كل خدمة
      صيانة مع سبب لو الأداء تحت المتوسط) + `GET /admin/reviews` (خانة تقييمات السكان)
- [x] **شريط تقدّم لكل طلب (Progress Bar)**: 4 مراحل — تم الحجز → في الطريق اليك → يتم تنفيذ العملية
      → تم تنفيذ العملية. موجود تلقائياً بحقل `progress` بكل استجابة من `/requests` (لأي دور)، ومجمّع
      لكل الطلبات مع الأسماء عبر `GET /admin/requests` (فيها فلترة اختيارية `?status_filter=`) —
      هاي الشاشة اللي الأدمن يراقب منها كل عملية بدقة
- [x] **`GET /admin/artisans/activity`**: عدد الطلبات لكل حرفي اليوم/هذا الشهر/هذي السنة — لـ
      Bar Chart بداشبورد الأدمن يقارن نشاط الحرفيين مع بعض
- [x] **`GET /artisans/me/monthly-building-stats`**: عدد الطلبات آخر 12 شهر مقسّمة حسب البناية
      (مستخرجة من نص الموقع الحر) — لـ Line Chart بداشبورد الحرفي، يساعده يشوف وين قلّت الطلبات
- [x] CORS مفعّل، حماية الأدوار على كل endpoint حساس
- [x] سكربت seed لبيانات تجريبية جاهزة للعرض (يشمل تقييم عالي وتقييم واطي عشان تنبيه below_average يبين شغال)

## لوحة الساكن (Resident Dashboard) — جديد

> ⚠️ **لازم تحذفين `artisan.db` وتعيدين `python -m scripts.seed`**: انضافت جداول
> (`residentprofile`, `requestimage`, `notification`, `complaint`) وأعمدة جديدة
> (`artisan.service_id`, `service.icon`, و `servicerequest.scheduled_at/price/...`)، و `artisan_id`
> بالطلب صار اختياري. `create_all` ما يعدل جداول موجودة.

كل endpoints `/resident/*` محمية بدور `customer`. سجلي دخول بـ `customer@demo.com`.

| جزء التصميم | Endpoint |
|---|---|
| الصفحة كاملة بطلب واحد | `GET /resident/dashboard` (`?notifications_limit=3&requests_limit=3`) |
| "مرحباً، علي حسين" + كارت السايدبار + ملفي الشخصي | `GET /resident/me` · تعديل: `PUT /resident/me` · الصورة: `POST /resident/me/avatar` |
| الجرس والرقم الأحمر + خانة الإشعارات | `GET /notifications` · `GET /notifications/unread-count` · `PUT /notifications/{id}/read` · `PUT /notifications/read-all` |
| اختر نوع الخدمة (عدد الحرفيين + أعلى 3) | `GET /resident/service-categories` |
| "عرض المزيد" | `GET /resident/services/{service_id}/artisans` |
| فورم طلب خدمة جديدة (multipart) | `POST /resident/requests` |
| طلباتي الحالية | `GET /resident/requests/current` |
| سجل الطلبات (السعر + التقييم) | `GET /resident/requests/history` (`?include_rejected=true`) |
| زر "عرض" | `GET /resident/requests/{id}` (مع الصور وشريط التقدم) |
| أيقونة التحميل بالسجل | `GET /resident/requests/{id}/invoice` (فاتورة HTML قابلة للطباعة) |
| متوسط تقييماتي | `GET /resident/ratings/summary` (المعدل + العدد + التوزيع) |
| صفحة التقييمات | `GET /resident/reviews` |
| نافذة "قيم خدمتك" | `GET /resident/pending-review` ← الإرسال بالـ `POST /reviews` الموجود |
| إرسال شكوى للإدارة | `POST /resident/complaints` · `GET /resident/complaints` |

### فورم الطلب الجديد (`multipart/form-data`)

| الحقل | إلزامي | ملاحظة |
|---|---|---|
| `service_id` | ✅ | نوع الخدمة |
| `images` | — | صور الضرر، لحد 5، كل وحدة ≤ 5MB (jpg/png/webp/heic) |
| `contact_name` | — | "اسمك" — الافتراضي اسم الحساب |
| `unit_number` | — | "رقم الوحدة" — الافتراضي رقم شقة الساكن |
| `scheduled_at` | — | "الوقت المناسب" بصيغة ISO مثل `2026-10-01T17:30` |
| `description` | — | وصف المشكلة |
| `preferred_artisan_id` | — | **للمشتركين فقط** (`is_subscriber`) — غير المشترك ياخذ 403 |

إذا ما انختار حرفي، الباكند يعيّن تلقائياً حرفي معتمد بنفس الخدمة (الأقل انشغالاً ثم الأعلى
تقييماً). إذا ماكو حرفي متاح، الطلب يبقى بدون حرفي مع إشعار "جاري البحث عن حرفي مناسب"، والأدمن
يربطه بـ `PUT /admin/requests/{id}/assign?artisan_id=`.

### الإشعارات تنولد تلقائياً
- إنشاء طلب → للساكن (تم استلام طلبك) وللحرفي (وصلك طلب جديد)
- `PUT /requests/{id}/status` → للساكن: قبول / رفض مع السبب / قيد التنفيذ / إكمال (قيّم تجربتك)
- رد الأدمن على شكوى (`PUT /admin/complaints/{id}`) → للساكن

`PUT /requests/{id}/status` صار يقبل حقول اختيارية: `rejection_reason` (مع rejected)، `price`
(مع completed — يظهر بعمود السعر والفاتورة)، `scheduled_at` (تثبيت الموعد عند القبول).

### حالات الطلب كما تظهر للساكن (`status_label`)
`pending` بانتظار القبول · `accepted` مقبول · `in_progress` قيد التنفيذ · `completed` مكتمل · `rejected` مرفوض

### إضافات لربط الفرونت (fixoria)
- `GET /auth/me` — الفرونت يناديها بعد الدخول حتى يعرف الاسم والدور.
- `POST /auth/register` يقبل `phone`, `building`, `apartment_number`, `floor` ويسوي ملف الساكن مباشرة.
  التسجيل كـ `admin` صار ممنوع (403) — حساب المشرف من الـ seed بس.
- `ArtisanRead` صار بيه `service_name`, `average_rating`, `reviews_count`.
- `GET /artisans/me/reviews` — تقييمات الحرفي مع اسم الساكن والخدمة.
- استجابات `/requests` صار بيها `service_name` و `customer_name`.
- `POST /resident/requests` يقبل حقل `building` اختياري.

### إصلاح جانبي
`GET /artisans/{artisan_id}` كان ناقصه الـ decorator وما كان مسجل بالـ API — انضاف.

## الخطوة الجاية (Day 4)

- تجربة الـ **Critical Demo Flow** كامل مرة وحدة عبر `/docs`:
  admin يعتمد حرفي → customer يدوّر ويفتح طلب → artisan يقبل ويكمل → customer يقيّم → admin يشوف الكل
- تنسيق مع زوزي وشمس: شكل كل response مطابق لما يتوقعونه بالفرونت (خصوصاً أسماء الحقول
  وقيم status)
- لو طلع شي ناقص أو بق أثناء التجربة، سوّيه fix بس — بدون features جديدة (حسب قاعدة اليوم 3-4)

## ملاحظة أمان

`.env` غير مرفوع (لازم تضيفينه لـ `.gitignore`) — لا ترفعين SECRET_KEY الحقيقي على GitHub.
