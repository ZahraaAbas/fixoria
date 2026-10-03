# Fixoria — Frontend (React + Vite)

مربوط بالباكند (`artisan-backend`, FastAPI). ماكو mocks — كل البيانات من الـ API.

## التشغيل

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://127.0.0.1:8000
npm run dev                 # http://localhost:5173
```

الباكند لازم يكون شغّال قبلها (راجع `../artisan-backend/README.md`).

## الصفحات والربط

| الصفحة | المسار | الـ API |
|---|---|---|
| تسجيل الدخول (ساكن/حرفي/مشرف) | `/login`, `/artisan/login`, `/admin/login` | `POST /auth/login` ثم `GET /auth/me` |
| إنشاء حساب ساكن | `/register` | `POST /auth/register` (مع الهاتف والبناية والشقة) |
| تصفح الخدمات | `/home` | `GET /services` |
| حرفيو الخدمة (بعد الضغط على خدمة) | `/services/:serviceId` | `GET /artisans?verified_only=true&service_id=` |
| الحرفيون + ملف الحرفي | `/artisans`, `/artisans/:id` | `GET /artisans?verified_only=true`, `GET /artisans/{id}` |
| طلب خدمة | `/requests/new/:categoryId` | `POST /resident/requests` (multipart مع الصور) |
| طلباتي | `/my-requests` | `GET /resident/requests/current` + `/history` |
| **لوحة الساكن** | `/dashboard` | `GET /resident/dashboard` + باقي `/resident/*` و `/notifications` |
| **لوحة الحرفي** | `/artisan/dashboard` | `/artisans/me`, `/requests`, `PUT /requests/{id}/status`, `/artisans/me/reviews`, `/artisans/me/monthly-building-stats` |
| **لوحة المشرف** | `/admin/dashboard` | `/admin/stats`, `/admin/artisans/activity`, `/admin/services/stats`, `/admin/artisans`, `/admin/complaints` |

بعد تسجيل الدخول كل دور يروح للوحته تلقائياً.

## ملاحظات تقنية

- كل الطلبات تمر من `src/services/api.js` (يضيف التوكن، يوحّد الأخطاء، ويسجّل الخروج تلقائياً عند 401).
- الباكند يسمي الساكن `customer`؛ `authService` يحوّله لـ `resident` اللي يستخدمه الفرونت.
- لوحة الساكن مبنية بـ Tailwind v4 (utilities فقط، بدون preflight) و `lucide-react`.
  ستايلها محصور داخل `.resident-dash` فما يأثر على باقي الصفحات.
- الأوقات تنرسل ISO/UTC وتنعرض بالتوقيت المحلي للمتصفح.
