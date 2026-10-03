import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiFetch, API_BASE, parseApiDate } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import AiAssistantModal from "../components/AiAssistantModal";
import "./ResidentDashboard.css";
import {
  Home,
  PlusSquare,
  ClipboardList,
  History,
  Star,
  Bell,
  User,
  Settings,
  LogOut,
  Zap,
  Droplet,
  Snowflake,
  Hammer,
  Wrench,
  Phone,
  Building2,
  Mail,
  MessageCircle,
  DoorOpen,
  Headphones,
  ImagePlus,
  Download,
  CheckCircle2,
  XCircle,
  Info,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";

/**
 * لوحة الساكن — مربوطة بالباكند عبر services/api.js (التوكن من AuthProvider).
 * كل البيانات من GET /resident/dashboard + باقي endpoints /resident/* و /notifications.
 */

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

const STATUS_STYLE = {
  pending: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-orange-50 text-orange-700 border-orange-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const SERVICE_ICONS = {
  zap: { Icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
  droplet: { Icon: Droplet, color: "text-sky-500", bg: "bg-sky-50" },
  snowflake: { Icon: Snowflake, color: "text-blue-600", bg: "bg-blue-50" },
  hammer: { Icon: Hammer, color: "text-orange-700", bg: "bg-orange-50" },
};
const serviceIcon = (name) => SERVICE_ICONS[name] || { Icon: Wrench, color: "text-slate-500", bg: "bg-slate-50" };

const parseDate = parseApiDate;

function timeOfDay(d) {
  return d.toLocaleTimeString("ar-IQ", { hour: "numeric", minute: "2-digit", numberingSystem: "latn" });
}

function formatAppointment(s) {
  const d = parseDate(s);
  if (!d) return "—";
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return `اليوم - ${timeOfDay(d)}`;
  if (same(d, tomorrow)) return `غداً - ${timeOfDay(d)}`;
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })} - ${timeOfDay(d)}`;
}

function formatDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("en-GB") : "—";
}

function timeAgo(s) {
  const d = parseDate(s);
  if (!d) return "";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} ${mins <= 10 ? "دقائق" : "دقيقة"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "قبل ساعة" : `قبل ${hours} ساعات`;
  const days = Math.round(hours / 24);
  return days === 1 ? "قبل يوم" : `قبل ${days} أيام`;
}

const formatPrice = (p) => (p == null ? "—" : `${p.toLocaleString("en-US")} د.ع`);

// ---------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------

function Avatar({ src, name, apiBase, size = 36 }) {
  const initials = (name || "؟").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  if (src) {
    const url = src.startsWith("http") ? src : `${apiBase}${src}`;
    return <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0"
    >
      {initials}
    </div>
  );
}

function StatusPill({ status, label }) {
  return (
    <span className={`inline-block text-xs border rounded-full px-3 py-1 whitespace-nowrap ${STATUS_STYLE[status] || ""}`}>
      {label}
    </span>
  );
}

function Card({ children, className = "" }) {
  return <section className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</section>;
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} my-8`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} aria-label="إغلاق" className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400";

function Field({ label, required, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm text-slate-600 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------

function ServiceCell({ row }) {
  const { Icon, color } = serviceIcon(row.service_icon);
  return (
    <span className="inline-flex items-center gap-2">
      <Icon size={15} className={color} /> {row.service_name}
    </span>
  );
}

function ArtisanCell({ row, apiBase }) {
  if (!row.artisan_name) return <span className="text-slate-400">جاري البحث...</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar src={row.artisan_image} name={row.artisan_name} apiBase={apiBase} size={28} /> {row.artisan_name}
    </span>
  );
}

function CurrentTable({ rows, apiBase, onView }) {
  if (!rows.length) return <p className="text-sm text-slate-500 p-6 text-center">ماكو طلبات حالية. اطلب خدمة جديدة من كروت الخدمات فوق.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs">
          <tr className="border-b border-slate-100">
            {["رقم الطلب", "الخدمة", "اسم الحرفي", "الموعد", "الحالة", "الإجراءات"].map((h) => (
              <th key={h} className="text-right font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-semibold">#{r.id}</td>
              <td className="px-4 py-3"><ServiceCell row={r} /></td>
              <td className="px-4 py-3"><ArtisanCell row={r} apiBase={apiBase} /></td>
              <td className="px-4 py-3 whitespace-nowrap">{formatAppointment(r.scheduled_at)}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} label={r.status_label} /></td>
              <td className="px-4 py-3">
                <button onClick={() => onView(r.id)} className="text-xs bg-slate-100 hover:bg-slate-200 rounded-md px-3 py-1.5">
                  عرض
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ rows, apiBase, onInvoice, onView }) {
  if (!rows.length) return <p className="text-sm text-slate-500 p-6 text-center">الطلبات المكتملة تظهر هنا.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-500 text-xs">
          <tr className="border-b border-slate-100">
            {["رقم الطلب", "الخدمة", "اسم الحرفي", "الموعد", "الحالة", "التقييم", "السعر", ""].map((h, i) => (
              <th key={i} className="text-right font-medium px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 font-semibold">
                <button onClick={() => onView(r.id)} className="hover:text-blue-700">#{r.id}</button>
              </td>
              <td className="px-4 py-3"><ServiceCell row={r} /></td>
              <td className="px-4 py-3"><ArtisanCell row={r} apiBase={apiBase} /></td>
              <td className="px-4 py-3">{formatDate(r.date)}</td>
              <td className="px-4 py-3"><StatusPill status={r.status} label={r.status_label} /></td>
              <td className="px-4 py-3 whitespace-nowrap">
                {r.my_rating ? (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star size={14} className="fill-amber-400 text-amber-400" /> {r.my_rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">لم يُقيّم</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{formatPrice(r.price)}</td>
              <td className="px-4 py-3">
                {r.status === "completed" && (
                  <button onClick={() => onInvoice(r.id)} aria-label={`تحميل فاتورة الطلب ${r.id}`} className="text-slate-500 hover:text-blue-700">
                    <Download size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------

// اختيار طريقة الطلب: يدوي (الفورم الحالي) أو المساعد الذكي
function RequestChoiceModal({ onClose, onManual, onAi }) {
  return (
    <Modal title="كيف تريد طلب الخدمة؟" onClose={onClose}>
      <div className="space-y-3">
        <button
          onClick={onManual}
          className="w-full flex items-center gap-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl p-4 text-right"
        >
          <PlusSquare className="text-blue-600 shrink-0" size={22} />
          <span>
            <span className="block font-bold text-slate-800 text-sm">طلب يدوي</span>
            <span className="block text-xs text-slate-500">اختر الخدمة واملأ بيانات الطلب بنفسك</span>
          </span>
        </button>
        <button
          onClick={onAi}
          className="w-full flex items-center gap-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl p-4 text-right"
        >
          <Sparkles className="text-blue-600 shrink-0" size={22} />
          <span>
            <span className="block font-bold text-slate-800 text-sm">اسأل المساعد الذكي</span>
            <span className="block text-xs text-slate-500">اوصف مشكلتك بكلامك وهو يجهّز الطلب لك</span>
          </span>
        </button>
      </div>
    </Modal>
  );
}

function NewRequestModal({ api, profile, categories, initialServiceId, initialArtisanId, onClose, onCreated }) {
  const [serviceId, setServiceId] = useState(initialServiceId || "");
  const [artisans, setArtisans] = useState([]);
  const [artisanId, setArtisanId] = useState(initialArtisanId || "");
  const [name, setName] = useState(profile?.name || "");
  const [unit, setUnit] = useState(profile?.apartment_number || "");
  const [when, setWhen] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!serviceId || !profile?.is_subscriber) {
      setArtisans([]);
      return;
    }
    api(`/resident/services/${serviceId}/artisans`).then(setArtisans).catch(() => setArtisans([]));
  }, [serviceId, profile, api]);

  const submit = async () => {
    if (!serviceId) return setError("اختر نوع الخدمة");
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("service_id", serviceId);
      if (name) fd.append("contact_name", name);
      if (unit) fd.append("unit_number", unit);
      if (when) fd.append("scheduled_at", new Date(when).toISOString());
      if (description) fd.append("description", description);
      if (artisanId) fd.append("preferred_artisan_id", artisanId);
      files.forEach((f) => fd.append("images", f));
      const created = await api("/resident/requests", { method: "POST", body: fd });
      onCreated(created);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="طلب خدمة جديدة" onClose={onClose}>
      <Field label="نوع الخدمة" required>
        <select className={inputCls} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setArtisanId(""); }}>
          <option value="">اختر نوع الخدمة</option>
          {categories.map((c) => <option key={c.service_id} value={c.service_id}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="صورة للضرر">
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center text-slate-500 hover:border-blue-300">
          <ImagePlus className="mx-auto text-blue-600 mb-2" size={24} />
          <span className="text-xs block">اضغط لرفع صورة أو اسحب وأفلت</span>
          <span className="text-[11px] text-slate-400">(يمكنك رفع أكثر من صورة، لحد 5)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="block w-full mt-3 text-xs"
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
          />
          {files.length > 0 && <span className="text-xs text-blue-700 block mt-2">{files.length} صورة مختارة</span>}
        </div>
      </Field>

      <Field label="اسمك" required>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="رقم الوحدة" required>
        <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} />
      </Field>
      <Field label="الوقت المناسب" required>
        <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="وصف المشكلة">
        <textarea rows={2} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
        <div className="text-amber-700 text-sm font-semibold mb-2">للمشتركين فقط</div>
        <span className="block text-sm text-slate-600 mb-1">أي حرفي تريده؟ (اختياري)</span>
        <select
          className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-400`}
          value={artisanId}
          disabled={!profile?.is_subscriber || !serviceId}
          onChange={(e) => setArtisanId(e.target.value)}
        >
          <option value="">{profile?.is_subscriber ? "اختر الحرفي" : "اشترك حتى تختار الحرفي"}</option>
          {artisans.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.average_rating ? `— ★ ${a.average_rating}` : ""}
            </option>
          ))}
        </select>
        {profile?.is_subscriber && !artisanId && (
          <span className="text-[11px] text-slate-500 block mt-1">بدون اختيار نعيّن لك أنسب حرفي متاح.</span>
        )}
      </div>

      {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60"
      >
        {busy ? "جارِ الإرسال..." : "إرسال الطلب"}
      </button>
    </Modal>
  );
}

function RequestDetailModal({ api, apiBase, requestId, onClose, onInvoice }) {
  const [req, setReq] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api(`/resident/requests/${requestId}`).then(setReq).catch((e) => setError(e.message));
  }, [api, requestId]);

  return (
    <Modal title={`تفاصيل الطلب #${requestId}`} onClose={onClose} wide>
      {error && <p className="text-rose-600 text-sm">{error}</p>}
      {!req && !error && <p className="text-slate-500 text-sm">جارِ التحميل...</p>}
      {req && (
        <div className="text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <ServiceCell row={req} />
            <StatusPill status={req.status} label={req.status_label} />
          </div>

          {req.progress.length > 0 ? (
            <ol className="grid grid-cols-4 gap-2 mb-5">
              {req.progress.map((s) => (
                <li key={s.key} className="text-center">
                  <span
                    className={`block h-1.5 rounded-full mb-2 ${
                      s.done ? "bg-blue-600" : s.active ? "bg-blue-300" : "bg-slate-200"
                    }`}
                  />
                  <span className={`text-[11px] ${s.active ? "text-blue-700 font-semibold" : s.done ? "text-slate-700" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="bg-rose-50 text-rose-700 rounded-lg p-3 mb-4">السبب: {req.rejection_reason || "غير محدد"}</p>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
            <div><dt className="text-slate-500 text-xs">الحرفي</dt><dd><ArtisanCell row={req} apiBase={apiBase} /></dd></div>
            <div><dt className="text-slate-500 text-xs">الموعد</dt><dd>{formatAppointment(req.scheduled_at)}</dd></div>
            <div><dt className="text-slate-500 text-xs">الاسم</dt><dd>{req.contact_name || "—"}</dd></div>
            <div><dt className="text-slate-500 text-xs">رقم الوحدة</dt><dd>{req.unit_number || "—"}</dd></div>
            <div><dt className="text-slate-500 text-xs">السعر</dt><dd>{formatPrice(req.price)}</dd></div>
            <div><dt className="text-slate-500 text-xs">تقييمي</dt><dd>{req.my_rating ? `★ ${req.my_rating}` : "—"}</dd></div>
          </dl>
          {req.description && <p className="bg-slate-50 rounded-lg p-3 mb-4">{req.description}</p>}

          {req.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {req.images.map((u) => (
                <a key={u} href={`${apiBase}${u}`} target="_blank" rel="noreferrer">
                  <img src={`${apiBase}${u}`} alt="صورة الضرر" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                </a>
              ))}
            </div>
          )}
          {req.status === "completed" && (
            <button onClick={() => onInvoice(req.id)} className="inline-flex items-center gap-2 text-blue-700 text-sm">
              <Download size={15} /> تحميل الفاتورة
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function ArtisansModal({ api, apiBase, category, onClose, onChoose, canChoose }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    api(`/resident/services/${category.service_id}/artisans`).then(setList).catch(() => setList([]));
  }, [api, category]);
  return (
    <Modal title={`حرفيو ${category.name}`} onClose={onClose}>
      {!list && <p className="text-slate-500 text-sm">جارِ التحميل...</p>}
      {list && list.length === 0 && <p className="text-slate-500 text-sm">ماكو حرفيين معتمدين لهذي الخدمة بعد.</p>}
      <ul className="divide-y divide-slate-100">
        {(list || []).map((a) => (
          <li key={a.id} className="flex items-center justify-between py-3">
            <span className="flex items-center gap-3">
              <Avatar src={a.image} name={a.name} apiBase={apiBase} />
              <span>
                <span className="block text-sm font-semibold">{a.name}</span>
                <span className="text-xs text-slate-500">{a.reviews_count} تقييم</span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              {a.average_rating && (
                <span className="inline-flex items-center gap-1 text-sm">
                  <Star size={14} className="fill-amber-400 text-amber-400" /> {a.average_rating}
                </span>
              )}
              {canChoose && (
                <button onClick={() => onChoose(a.id)} className="text-xs bg-blue-50 text-blue-700 rounded-md px-3 py-1.5 hover:bg-blue-100">
                  اطلب
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ComplaintModal({ api, onClose, onSent }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState("");
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => api("/resident/complaints").then(setMine).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/resident/complaints", {
        method: "POST",
        body: ({ subject, message, request_id: requestId ? Number(requestId) : null }),
      });
      setSubject("");
      setMessage("");
      setRequestId("");
      await load();
      onSent();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const statusAr = { open: "مفتوحة", in_review: "قيد المتابعة", resolved: "تم الحل" };
  return (
    <Modal title="إرسال شكوى للإدارة" onClose={onClose}>
      <Field label="العنوان" required>
        <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="التفاصيل" required>
        <textarea rows={3} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Field label="رقم الطلب المتعلق (اختياري)">
        <input className={inputCls} inputMode="numeric" value={requestId} onChange={(e) => setRequestId(e.target.value.replace(/\D/g, ""))} />
      </Field>
      {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}
      <button onClick={submit} disabled={busy || !subject.trim() || !message.trim()} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-50">
        {busy ? "جارِ الإرسال..." : "إرسال الشكوى"}
      </button>

      {mine.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-700 mb-2">شكاواي</h3>
          <ul className="space-y-2">
            {mine.map((c) => (
              <li key={c.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold">{c.subject}</span>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{statusAr[c.status] || c.status}</span>
                </div>
                {c.admin_reply && <p className="text-xs text-blue-800 bg-blue-50 rounded p-2 mt-2">رد الإدارة: {c.admin_reply}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function ProfileEditModal({ api, profile, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name || "",
    email: profile.email || "",
    phone: profile.phone || "",
    whatsapp: profile.whatsapp || "",
    apartment_number: profile.apartment_number || "",
    building: profile.building || "",
    floor: profile.floor || "",
  });
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/resident/me", { method: "PUT", body: (form) });
      if (avatar) {
        const fd = new FormData();
        fd.append("file", avatar);
        await api("/resident/me/avatar", { method: "POST", body: fd });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    ["name", "الاسم"], ["email", "البريد الإلكتروني"], ["phone", "رقم الهاتف"], ["whatsapp", "واتساب"],
    ["apartment_number", "رقم الشقة"], ["building", "البناية"], ["floor", "الطابق"],
  ];
  return (
    <Modal title="تعديل الملف الشخصي" onClose={onClose}>
      {fields.map(([k, label]) => (
        <Field key={k} label={label}>
          <input className={inputCls} value={form[k]} onChange={set(k)} />
        </Field>
      ))}
      <Field label="الصورة الشخصية">
        <input type="file" accept="image/*" className="text-xs" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
      </Field>
      {error && <p className="text-rose-600 text-xs mb-3">{error}</p>}
      <button onClick={save} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
        {busy ? "جارِ الحفظ..." : "حفظ التعديلات"}
      </button>
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Side widgets
// ---------------------------------------------------------------------

function NotificationIcon({ type }) {
  if (type === "request_accepted" || type === "request_completed")
    return <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />;
  if (type === "request_rejected") return <XCircle size={20} className="text-rose-600 shrink-0" />;
  return <Info size={20} className="text-blue-600 shrink-0" />;
}

function NotificationsList({ items, onRead }) {
  if (!items.length) return <p className="text-sm text-slate-500 py-4 text-center">ماكو إشعارات بعد.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((n) => (
        <li key={n.id}>
          <button
            onClick={() => !n.is_read && onRead(n.id)}
            className={`w-full text-right flex items-start gap-3 py-3 ${n.is_read ? "opacity-70" : ""}`}
          >
            <span className="flex-1 min-w-0">
              <span className={`block text-sm ${n.is_read ? "" : "font-bold"} text-slate-800`}>{n.title}</span>
              {n.body && <span className="block text-xs text-slate-500 mt-0.5">{n.body}</span>}
              <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</span>
            </span>
            <NotificationIcon type={n.type} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 justify-center my-3" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} role="radio" aria-checked={value === n} aria-label={`${n} نجوم`} onClick={() => onChange(n)}>
          <Star size={28} className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
        </button>
      ))}
    </div>
  );
}

function RateServiceCard({ api, pending, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!pending || hidden) return null;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/reviews", {
        method: "POST",
        body: ({ request_id: pending.request_id, rating, comment: comment || null }),
      });
      setComment("");
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">قيم خدمتك</h3>
        <button onClick={() => setHidden(true)} aria-label="إخفاء" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
      </div>
      <p className="text-sm text-slate-600 mt-2">كيف كانت تجربتك مع الحرفي {pending.artisan_name}؟</p>
      <p className="text-xs text-slate-400">طلب #{pending.request_id} — {pending.service_name}</p>
      <StarPicker value={rating} onChange={setRating} />
      <label className="block text-xs text-slate-500 mb-1">اكتب تعليقك (اختياري)</label>
      <textarea rows={3} className={inputCls} placeholder="اكتب هنا..." value={comment} onChange={(e) => setComment(e.target.value)} />
      {error && <p className="text-rose-600 text-xs mt-2">{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold disabled:opacity-60">
        {busy ? "جارِ الإرسال..." : "إرسال التقييم"}
      </button>
    </Card>
  );
}

function RatingSummaryCard({ summary }) {
  const avg = summary?.average;
  return (
    <Card className="p-5 text-center">
      <h3 className="font-bold text-slate-800 flex items-center justify-center gap-2">
        <Star size={18} className="text-amber-400" /> متوسط تقييماتي
      </h3>
      {avg ? (
        <>
          <div className="mt-2 text-slate-800">
            <span className="text-4xl font-black">{avg}</span>
            <span className="text-slate-400 text-lg"> / 5</span>
          </div>
          <div className="flex justify-center gap-1 my-2" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={22} className={n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
            ))}
          </div>
          <p className="text-xs text-slate-500">بناءً على {summary.count} تقييمات</p>
        </>
      ) : (
        <p className="text-sm text-slate-500 mt-3">قيّم طلباتك المكتملة حتى يظهر معدلك هنا.</p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

const NAV = [
  { key: "home", label: "الرئيسية", Icon: Home },
  { key: "new", label: "طلب خدمة جديدة", Icon: PlusSquare },
  { key: "current", label: "طلباتي الحالية", Icon: ClipboardList },
  { key: "history", label: "سجل الطلبات", Icon: History },
  { key: "reviews", label: "التقييمات", Icon: Star },
  { key: "notifications", label: "الإشعارات", Icon: Bell },
  { key: "profile", label: "الملف الشخصي", Icon: User },
  { key: "settings", label: "إعدادات", Icon: Settings },
];

export default function ResidentDashboard() {
  const routerNavigate = useNavigate();
  const { user, signOut } = useAuth();
  const apiBase = API_BASE;
  const api = apiFetch;

  const [view, setView] = useState("home");
  const [dash, setDash] = useState(null);
  const [fullList, setFullList] = useState(null); // لصفحات: الحالية / السجل / التقييمات / الإشعارات
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [newReq, setNewReq] = useState(null); // {serviceId, artisanId}
  const [choosing, setChoosing] = useState(false); // نافذة (يدوي / مساعد ذكي)
  const [aiOpen, setAiOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [artisansOf, setArtisansOf] = useState(null);
  const [showComplaint, setShowComplaint] = useState(false);
  const [editProfile, setEditProfile] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDash(await api("/resident/dashboard"));
    } catch (e) {
      setError(e.message === "NETWORK_ERROR" ? "تعذّر الاتصال بالخادم — تأكد أن الباكند شغّال" : e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadDashboard();
  }, [user.id, loadDashboard]);

  useEffect(() => {
    setFullList(null);
    const paths = {
      current: "/resident/requests/current",
      history: "/resident/requests/history?include_rejected=true",
      reviews: "/resident/reviews",
      notifications: "/notifications",
    };
    if (paths[view]) api(paths[view]).then(setFullList).catch((e) => setError(e.message));
  }, [view, api]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const logout = () => {
    signOut();
    routerNavigate("/", { replace: true });
  };

  const markRead = async (id) => {
    await api(`/notifications/${id}/read`, { method: "PUT" }).catch(() => {});
    loadDashboard();
    if (view === "notifications") api("/notifications").then(setFullList);
  };

  const markAllRead = async () => {
    await api("/notifications/read-all", { method: "PUT" }).catch(() => {});
    loadDashboard();
    if (view === "notifications") api("/notifications").then(setFullList);
  };

  const downloadInvoice = async (id) => {
    try {
      const res = await api(`/resident/requests/${id}/invoice`, { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const goTo = (key) => {
    if (key === "new") return setChoosing(true);
    setView(key);
  };

  const profile = dash?.profile;
  const unread = dash?.unread_notifications_count || 0;

  // ---------------- Layout ----------------
  return (
    <div dir="rtl" className="resident-dash min-h-screen bg-slate-50 text-slate-800">
      <div className="flex flex-col lg:flex-row gap-5 p-4 lg:p-5 max-w-[1440px] mx-auto">
        {/* ===== Sidebar (يمين) ===== */}
        <aside className="lg:w-64 shrink-0 space-y-4">
          <Card className="p-5">
            <div className="text-center">
              <div className="relative inline-block">
                <Avatar src={profile?.avatar} name={profile?.name} apiBase={apiBase} size={80} />
                <span className="absolute bottom-1 left-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="font-bold mt-2">{profile?.name}</div>
              <div className="text-xs text-slate-500">{profile?.role_label}</div>
            </div>
            <nav className="mt-5 space-y-1" aria-label="القائمة الرئيسية">
              {NAV.map(({ key, label, Icon }) => {
                const active = view === key;
                return (
                  <button
                    key={key}
                    onClick={() => goTo(key)}
                    aria-current={active ? "page" : undefined}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                      active ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="relative">
                      <Icon size={18} className={active ? "text-blue-600" : "text-slate-500"} />
                      {key === "notifications" && unread > 0 && (
                        <span className="absolute -top-2 -left-2 bg-rose-600 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unread}</span>
                      )}
                    </span>
                  </button>
                );
              })}
              <button onClick={logout} className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 border-t border-slate-100 mt-2 pt-3">
                <span>تسجيل خروج</span>
                <LogOut size={18} />
              </button>
            </nav>
          </Card>

          {profile && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">ملفي الشخصي</h3>
                <button onClick={() => setEditProfile(true)} className="text-xs text-blue-700 hover:underline">تعديل</button>
              </div>
              <dl className="space-y-3 text-sm">
                {[
                  ["الاسم", profile.name, User],
                  ["رقم الهاتف", profile.phone, Phone],
                  ["رقم الشقة", profile.apartment_number, DoorOpen],
                  ["البناية/الوحدة", profile.building_unit, Building2],
                  ["البريد الإلكتروني", profile.email, Mail],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="flex items-start justify-between gap-2 border-b border-slate-50 pb-2">
                    <div className="min-w-0">
                      <dt className="text-xs text-slate-500">{label}</dt>
                      <dd className="break-all">{value || "—"}</dd>
                    </div>
                    <Icon size={16} className="text-slate-400 mt-1 shrink-0" />
                  </div>
                ))}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <dt className="text-xs text-slate-500">بيانات التواصل</dt>
                    <dd className="flex items-center gap-1.5">
                      <MessageCircle size={15} className="text-emerald-600" /> {profile.whatsapp || "—"}
                    </dd>
                  </div>
                </div>
              </dl>
            </Card>
          )}
        </aside>

        {/* ===== Main (وسط) ===== */}
        <main className="flex-1 min-w-0 space-y-5">
          <header className="flex items-center justify-between">
            <h1 className="text-xl font-bold">مرحباً، {dash?.greeting_name || "..."}</h1>
            <div className="flex items-center gap-3">
              <button onClick={loadDashboard} aria-label="تحديث" className="text-slate-400 hover:text-slate-700">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => setView("notifications")} aria-label={`الإشعارات (${unread} غير مقروءة)`} className="relative">
                <Bell size={22} className="text-slate-700" />
                {unread > 0 && (
                  <span className="absolute -top-1.5 -left-1.5 bg-rose-600 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unread}</span>
                )}
              </button>
            </div>
          </header>

          {error && (
            <p className="text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-4 py-2 text-sm flex justify-between">
              {error}
              <button onClick={() => setError("")} aria-label="إغلاق"><X size={14} /></button>
            </p>
          )}
          {!dash && loading && <p className="text-slate-500">جارِ تحميل البيانات...</p>}

          {dash && view === "home" && (
            <>
              <section>
                <h2 className="font-bold mb-3">اختر نوع الخدمة التي تحتاجها</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {dash.service_categories.map((c) => {
                    const { Icon, color, bg } = serviceIcon(c.icon);
                    return (
                      <Card key={c.service_id} className="overflow-hidden flex flex-col">
                        <button
                          onClick={() => setNewReq({ serviceId: String(c.service_id) })}
                          className={`${bg} flex items-center justify-between px-4 py-4 text-right hover:brightness-95`}
                        >
                          <span>
                            <span className="block font-bold">{c.name}</span>
                            <span className="text-xs text-slate-600">{c.artisans_count} حرفيين</span>
                          </span>
                          <Icon size={30} className={color} />
                        </button>
                        <ul className="px-4 py-2 flex-1">
                          {c.top_artisans.map((a) => (
                            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                              <span className="flex items-center gap-2 min-w-0">
                                <Avatar src={a.image} name={a.name} apiBase={apiBase} size={30} />
                                <span className="truncate">{a.name}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                                {a.average_rating ?? "—"}
                                <Star size={13} className="fill-amber-400 text-amber-400" />
                              </span>
                            </li>
                          ))}
                          {c.top_artisans.length === 0 && <li className="text-xs text-slate-400 py-3">ماكو حرفيين بعد</li>}
                        </ul>
                        <button onClick={() => setArtisansOf(c)} className="text-xs text-blue-700 py-3 border-t border-slate-100 hover:bg-slate-50">
                          عرض المزيد
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="font-bold mb-3">طلباتي الحالية</h2>
                <Card>
                  <CurrentTable rows={dash.current_requests} apiBase={apiBase} onView={setDetailId} />
                  <button onClick={() => setView("current")} className="w-full text-xs text-blue-700 py-3 border-t border-slate-100 hover:bg-slate-50">
                    عرض كل الطلبات الحالية
                  </button>
                </Card>
              </section>

              <section>
                <h2 className="font-bold mb-3">سجل الطلبات</h2>
                <Card>
                  <HistoryTable rows={dash.history} apiBase={apiBase} onInvoice={downloadInvoice} onView={setDetailId} />
                  <button onClick={() => setView("history")} className="w-full text-xs text-blue-700 py-3 border-t border-slate-100 hover:bg-slate-50">
                    عرض كل الطلبات السابقة
                  </button>
                </Card>
              </section>
            </>
          )}

          {view === "current" && (
            <section>
              <h2 className="font-bold mb-3">كل الطلبات الحالية</h2>
              <Card>{fullList ? <CurrentTable rows={fullList} apiBase={apiBase} onView={setDetailId} /> : <p className="p-6 text-sm text-slate-500">جارِ التحميل...</p>}</Card>
            </section>
          )}

          {view === "history" && (
            <section>
              <h2 className="font-bold mb-3">سجل الطلبات</h2>
              <Card>{fullList ? <HistoryTable rows={fullList} apiBase={apiBase} onInvoice={downloadInvoice} onView={setDetailId} /> : <p className="p-6 text-sm text-slate-500">جارِ التحميل...</p>}</Card>
            </section>
          )}

          {view === "reviews" && (
            <section>
              <h2 className="font-bold mb-3">تقييماتي</h2>
              <Card className="p-4">
                {!fullList && <p className="text-sm text-slate-500">جارِ التحميل...</p>}
                {fullList && fullList.length === 0 && <p className="text-sm text-slate-500">ما كتبت أي تقييم بعد.</p>}
                <ul className="divide-y divide-slate-100">
                  {(fullList || []).map((r) => (
                    <li key={r.id} className="py-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold">{r.artisan_name} — {r.service_name}</span>
                        <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {r.rating}</span>
                      </div>
                      {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                      <span className="text-[11px] text-slate-400">{formatDate(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          {view === "notifications" && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold">كل الإشعارات</h2>
                <button onClick={markAllRead} className="text-xs text-blue-700 hover:underline">تعليم الكل كمقروء</button>
              </div>
              <Card className="px-4">{fullList ? <NotificationsList items={fullList} onRead={markRead} /> : <p className="p-6 text-sm text-slate-500">جارِ التحميل...</p>}</Card>
            </section>
          )}

          {view === "profile" && profile && (
            <section>
              <h2 className="font-bold mb-3">الملف الشخصي</h2>
              <Card className="p-6 flex flex-col sm:flex-row items-center gap-6">
                <Avatar src={profile.avatar} name={profile.name} apiBase={apiBase} size={96} />
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm flex-1">
                  {[["الاسم", profile.name], ["البريد الإلكتروني", profile.email], ["رقم الهاتف", profile.phone], ["واتساب", profile.whatsapp],
                    ["رقم الشقة", profile.apartment_number], ["البناية/الوحدة", profile.building_unit],
                    ["الاشتراك", profile.is_subscriber ? "مشترك" : "غير مشترك"]].map(([l, v]) => (
                    <div key={l}><dt className="text-xs text-slate-500">{l}</dt><dd>{v || "—"}</dd></div>
                  ))}
                </dl>
                <button onClick={() => setEditProfile(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm">تعديل</button>
              </Card>
            </section>
          )}

          {view === "settings" && (
            <section>
              <h2 className="font-bold mb-3">إعدادات</h2>
              <Card className="p-6 max-w-md">
                <p className="text-sm text-slate-600 mb-2">الخادم: {apiBase}</p>
                <p className="text-xs text-slate-500">حالة الاشتراك: {profile?.is_subscriber ? "مشترك — تقدر تختار الحرفي بطلباتك" : "غير مشترك"}</p>
              </Card>
            </section>
          )}
        </main>

        {/* ===== Widgets (يسار) ===== */}
        {dash && (
          <aside className="lg:w-72 shrink-0 space-y-4">
            <Card className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">الإشعارات</h3>
                <button onClick={() => setView("notifications")} className="text-xs text-blue-700 hover:underline">عرض الكل</button>
              </div>
              <NotificationsList items={dash.notifications} onRead={markRead} />
              <button onClick={() => setView("notifications")} className="w-full text-xs text-blue-700 py-3 border-t border-slate-100">
                عرض جميع الإشعارات
              </button>
            </Card>

            <RatingSummaryCard summary={dash.ratings_summary} />

            <button
              onClick={() => setShowComplaint(true)}
              className="w-full bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between text-right hover:bg-blue-100"
            >
              <span>
                <span className="block font-bold text-blue-800">إرسال شكوى للإدارة</span>
                <span className="text-xs text-slate-600">تواجه مشكلة؟ أخبرنا وسيتم متابعتها</span>
              </span>
              <Headphones size={30} className="text-blue-600 shrink-0" />
            </button>

            <RateServiceCard
              key={dash.pending_review?.request_id || "none"}
              api={api}
              pending={dash.pending_review}
              onDone={() => { flash("تم إرسال التقييم"); loadDashboard(); }}
            />
          </aside>
        )}
      </div>

      {/* ===== Modals ===== */}
      {newReq && dash && (
        <NewRequestModal
          api={api}
          profile={profile}
          categories={dash.service_categories}
          initialServiceId={newReq.serviceId}
          initialArtisanId={newReq.artisanId}
          onClose={() => setNewReq(null)}
          onCreated={(r) => { setNewReq(null); flash(`تم إرسال طلبك رقم #${r.id}`); loadDashboard(); }}
        />
      )}
      {choosing && (
        <RequestChoiceModal
          onClose={() => setChoosing(false)}
          onManual={() => { setChoosing(false); setNewReq({}); }}
          onAi={() => { setChoosing(false); setAiOpen(true); }}
        />
      )}
      {aiOpen && dash && (
        <AiAssistantModal
          profile={profile}
          categories={dash.service_categories}
          onClose={() => setAiOpen(false)}
          onCreated={(r) => { setAiOpen(false); flash(`تم إرسال طلبك رقم #${r.id}`); loadDashboard(); setDetailId(r.id); }}
        />
      )}
      {detailId && <RequestDetailModal api={api} apiBase={apiBase} requestId={detailId} onClose={() => setDetailId(null)} onInvoice={downloadInvoice} />}
      {artisansOf && (
        <ArtisansModal
          api={api}
          apiBase={apiBase}
          category={artisansOf}
          canChoose={!!profile?.is_subscriber}
          onClose={() => setArtisansOf(null)}
          onChoose={(artisanId) => {
            setNewReq({ serviceId: String(artisansOf.service_id), artisanId: String(artisanId) });
            setArtisansOf(null);
          }}
        />
      )}
      {showComplaint && <ComplaintModal api={api} onClose={() => setShowComplaint(false)} onSent={() => flash("تم إرسال الشكوى للإدارة")} />}
      {editProfile && profile && (
        <ProfileEditModal api={api} profile={profile} onClose={() => setEditProfile(false)} onSaved={() => { setEditProfile(false); flash("تم حفظ التعديلات"); loadDashboard(); }} />
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm rounded-lg px-4 py-2.5 shadow-lg flex items-center gap-2 z-50">
          <CheckCircle2 size={16} className="text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}
