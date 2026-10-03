# Fixoria — المشروع كامل (باكند + فرونت مربوطين)

```
fixoria-full/
├── artisan-backend/   # FastAPI + SQLite
└── fixoria/           # React + Vite
```

## التشغيل (terminalين)

**1) الباكند**
```bash
cd artisan-backend
python -m venv venv && source venv/bin/activate     # ويندوز: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
rm -f artisan.db            # ضروري إذا عندك قاعدة قديمة — انضافت جداول وأعمدة
python -m scripts.seed
uvicorn app.main:app --reload                        # http://127.0.0.1:8000/docs
```

**2) الفرونت**
```bash
cd fixoria
npm install
cp .env.example .env
npm run dev                                          # http://localhost:5173
```

## حسابات تجريبية (كلمة المرور للكل: `Passw0rd!`)

| الدور | الإيميل | يفتح على |
|---|---|---|
| ساكن (علي حسين، مشترك) | customer@demo.com | `/login` ← `/dashboard` |
| ساكن ثاني | neighbor@demo.com | `/login` ← `/dashboard` |
| حرفي كهرباء | artisan@demo.com | `/artisan/login` ← `/artisan/dashboard` |
| حرفي سباكة | plumber@demo.com | `/artisan/login` ← `/artisan/dashboard` |
| مشرف | admin@demo.com | `/admin/login` ← `/admin/dashboard` |

الحسابات القديمة مال الـ mocks (`@fixoria.test`) انشالت — استخدم الجدول فوق.

## سيناريو تجربة كامل
1. ساكن يسجل دخول → من `/home` يختار خدمة ويرسل طلب (مع صورة).
2. حرفي الخدمة يسجل دخول → يلگى الطلب بـ "طلبات تحتاج موافقتك" → قبول → بدء التنفيذ → إكمال (مع السعر).
3. الساكن يشوف الإشعارات بلوحته، ونافذة "قيم خدمتك" تطلع → يقيّم.
4. المشرف يشوف كل شي بلوحته، ويتابع الشكاوى ويوثّق الحرفيين الجدد.

## المساعد الذكي لطلب الخدمة

من لوحة الساكن → «طلب جديد» → تختار **طلب يدوي** أو **المساعد الذكي**.
الساكن يكتب المشكلة بكلامه (مثلاً: `حنفية المطبخ تسرّب وأريد أحد يجي اليوم`)، المساعد يطلع ملخص
(الخدمة، المشكلة، الأولوية، الوقت) → **تأكيد** أو **تعديل** → الطلب ينرسل بنفس `POST /resident/requests`
مال الطلب اليدوي، فيصير تعيين الحرفي وإشعاره وإشعار الساكن بنفس الطريقة.

**يشتغل بدون أي مفتاح:** إذا `AI_API_KEY` فارغ (أو فشل الاتصال بالإنترنت/المزود) يشتغل المحلل المحلي
`app/ai_offline.py` تلقائياً — يفهم عربي فصيح ولهجة عراقية وإنجليزي، ويطابق الخدمات الموجودة بقاعدة البيانات.

**لتفعيل الذكاء الاصطناعي الحقيقي (مجاني):** خذ مفتاح Gemini من https://aistudio.google.com/apikey وحطه بـ `.env`:
```env
AI_PROVIDER=gemini
AI_API_KEY=المفتاح
```
أو Claude: `AI_PROVIDER=anthropic` و `AI_MODEL=claude-haiku-4-5-20251001`.
المفتاح يبقى بالباكند فقط — لا تحطه بالفرونت ولا ترفع ملف `.env` على GitHub.

جمل للتجربة بالعرض:
- `المكيف ما يبرد باچر الصبح` ← تكييف، غداً 10:00
- `الضوء بالحمام ما يشتغل وأكو شرارة من الفيش` ← كهرباء، **عاجل**
- `أحتاج سباك` ← يسأل «شنو المشكلة بالضبط؟» ثم `المغسلة مسدودة`
- `مرحبا` ← يطلب توضيح وما ينشئ أي طلب
