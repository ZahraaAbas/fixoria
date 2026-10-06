# رفع "سبع صنايع" على Vercel

كل شي على Vercel، بمشروعين:

| الجزء | مشروع Vercel | الرابط |
| --- | --- | --- |
| الواجهة (React) | `fixoria-vxo8` | https://fixoria-vxo8.vercel.app |
| الخادم (FastAPI، مجلد `artisan-backend`) | `fixoria` | https://fixoria-ten.vercel.app |
| قاعدة البيانات (PostgreSQL) | Neon، مربوطة بمشروع `fixoria` | |
| الصور والتسجيلات الصوتية | Vercel Blob، مربوط بمشروع `fixoria` | |

> على Vercel الخادم ما يگدر يكتب ملفات على القرص، لهذا قاعدة البيانات بـ Neon والملفات بـ Blob.
> محلياً ما تغير شي: بدون هاي الإعدادات الخادم يستخدم `artisan.db` ومجلد `uploads` مثل قبل.

## 1) قاعدة البيانات (مرة وحدة)

مشروع `fixoria` → **Storage → Create Database → Neon (Postgres)**:
- المنطقة: **US East (N. Virginia)** حتى تكون جنب الخادم (Vercel يشغّل الخادم بواشنطن افتراضياً).
- اربطيها بالمشروع لبيئات **Production** و **Preview**. Vercel يضيف `DATABASE_URL` تلقائياً.

## 2) تخزين الملفات (مرة وحدة)

مشروع `fixoria` → **Storage → Create → Blob**:
- نوع الوصول: **Public** (حتى الصور تفتح بالموقع).
- اربطيه بنفس المشروع. Vercel يضيف `BLOB_READ_WRITE_TOKEN` تلقائياً.

## 3) متغيرات الخادم

مشروع `fixoria` → **Settings → Environment Variables**:

| المتغير | القيمة |
| --- | --- |
| `SECRET_KEY` | نص عشوائي طويل. ولّديه بـ `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `SEED_DEMO_DATA` | `1` (يعبي البيانات التجريبية أول مرة فقط، وما يكررها) |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` | اختياري. بدونها المساعد الذكي يشتغل بالمحلل المحلي |

بعدها **Deployments → آخر نشر → Redeploy**. افتحي https://fixoria-ten.vercel.app ولازم يطلع `{"status":"ok", ...}`.

## 4) ربط الواجهة بالخادم

مشروع `fixoria-vxo8` → **Settings → Environment Variables**:
- `VITE_API_BASE_URL` = `https://fixoria-ten.vercel.app` (بدون `/` بالنهاية) لـ **Production** و **Preview**.
- **Redeploy** (المتغير ينقرأ وقت البناء، فلازم إعادة نشر).

## ملاحظات

- الصور تتصغر بالمتصفح قبل الرفع (1600px)، لأن Vercel يرفض أي طلب أكبر من 4.5MB.
- الحسابات التجريبية (`admin@demo.com` وغيرها) كلمة سرها معروفة بالكود. أي شخص يگدر يدخل كمشرف، فلا تحطون بيانات حقيقية.
- بعد سحب التحديث محلياً: `pip install -r requirements.txt` داخل `artisan-backend` (مكتبة PostgreSQL الجديدة).
