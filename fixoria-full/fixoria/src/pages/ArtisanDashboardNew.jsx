import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { apiFetch, ApiError, parseApiDate } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './ArtisanDashboardNew.css';
import './DashboardShared.css';

const LINE_COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#ef4444', '#0ea5e9'];

function formatWhen(value) {
  const d = parseApiDate(value);
  return d ? d.toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' }) : null;
}

function CreateProfile({ onCreated }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ phone: '', service_id: '', description: '', location: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/services', { auth: false }).then(setServices).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    const service = services.find((s) => s.id === Number(form.service_id));
    if (!form.phone.trim() || !service) {
      setError('رقم الهاتف ونوع الخدمة مطلوبين');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/artisans', {
        method: 'POST',
        body: { ...form, service_id: service.id, specialty: service.name },
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="dash-card" onSubmit={submit} style={{ maxWidth: 480 }}>
      <div className="dash-card-header">
        <h3>أكمل ملفك كحرفي</h3>
      </div>
      <p className="dash-list-sub">بعد الإنشاء، الإدارة لازم توثّق حسابك حتى يظهر للسكان.</p>
      {[
        ['phone', 'رقم الهاتف'],
        ['location', 'المنطقة'],
        ['description', 'نبذة عنك'],
      ].map(([name, label]) => (
        <label key={name} style={{ display: 'block', marginTop: 12 }}>
          <span className="dash-list-sub">{label}</span>
          <input
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', font: 'inherit' }}
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          />
        </label>
      ))}
      <label style={{ display: 'block', marginTop: 12 }}>
        <span className="dash-list-sub">نوع الخدمة</span>
        <select
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', font: 'inherit' }}
          value={form.service_id}
          onChange={(e) => setForm({ ...form, service_id: e.target.value })}
        >
          <option value="">اختر</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      {error && <p className="dash-list-warn">{error}</p>}
      <button type="submit" className="dash-btn dash-btn-primary" style={{ marginTop: 16 }} disabled={busy}>
        {busy ? 'جارِ الحفظ...' : 'إنشاء الملف'}
      </button>
    </form>
  );
}

export default function ArtisanDashboardNew() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [requests, setRequests] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [trend, setTrend] = useState({ buildings: [], data: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      let me;
      try {
        me = await apiFetch('/artisans/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsProfile(true);
          setProfile(null);
          return;
        }
        throw err;
      }
      setNeedsProfile(false);
      setProfile(me);

      const [requestsData, reviewsData, trendData] = await Promise.all([
        apiFetch('/requests'),
        apiFetch('/artisans/me/reviews').catch(() => []),
        apiFetch('/artisans/me/monthly-building-stats').catch(() => ({ buildings: [], data: [] })),
      ]);
      setRequests([...requestsData].sort((a, b) => b.id - a.id));
      setReviews(reviewsData);
      setTrend(trendData);
    } catch (err) {
      setError(err.message === 'NETWORK_ERROR' ? 'تعذّر الاتصال بالخادم' : err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeStatus(request, status) {
    const body = { status };
    if (status === 'rejected') {
      const reason = window.prompt('سبب الرفض (يوصل للساكن):', 'غير متاح في هذا الوقت');
      if (reason === null) return;
      body.rejection_reason = reason;
    }
    if (status === 'completed') {
      const price = window.prompt('السعر بالدينار العراقي (اختياري):', '');
      if (price === null) return;
      const parsed = Number(String(price).replace(/[^\d]/g, ''));
      if (price.trim() && Number.isFinite(parsed)) body.price = parsed;
    }

    setBusyId(request.id);
    try {
      await apiFetch(`/requests/${request.id}/status`, { method: 'PUT', body });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function handleLogout() {
    signOut();
    navigate('/', { replace: true });
  }

  if (loading) return <div className="dash-loading">جاري التحميل...</div>;

  const header = (title, subtitle) => (
    <header className="dash-header">
      <div className="dash-header-row">
        <div>
          <p className="dash-greeting">أهلاً بيك 👋</p>
          <h1 className="dash-title">{title}</h1>
          {subtitle && <p className="dash-subtitle">{subtitle}</p>}
        </div>
        <div className="dash-header-actions">
          <button type="button" className="dash-link-btn" onClick={() => { setLoading(true); load(); }}>تحديث</button>
          <button type="button" className="dash-link-btn dash-link-btn-danger" onClick={handleLogout}>تسجيل الخروج</button>
        </div>
      </div>
    </header>
  );

  const errorBox = error && (
    <div className="dash-alert" role="alert">
      {error}
      <button type="button" onClick={() => setError(null)} aria-label="إغلاق">✕</button>
    </div>
  );

  if (needsProfile) {
    return (
      <div className="dash-wrap" dir="rtl">
        {header('لوحة الحرفي')}
        {errorBox}
        <CreateProfile onCreated={() => { setLoading(true); load(); }} />
      </div>
    );
  }
  if (!profile) return <div className="dash-error">حدث خطأ: {error}</div>;

  const needsApproval = requests.filter((r) => r.status === 'pending');
  const inProgress = requests.filter((r) => ['accepted', 'in_progress'].includes(r.status));
  const completed = requests.filter((r) => r.status === 'completed');

  const avgRating = profile.average_rating?.toFixed(1) ?? '—';

  const statCards = [
    { label: 'طلبات تحتاج موافقتك', value: needsApproval.length, icon: '🔔', accent: '#fee2e2' },
    { label: 'مواعيدك الحالية', value: inProgress.length, icon: '🛠️', accent: '#fef3c7' },
    { label: 'الطلبات المكتملة', value: completed.length, icon: '✅', accent: '#dcfce7' },
    { label: 'متوسط تقييمك', value: avgRating, icon: '⭐', accent: '#dbeafe' },
  ];

  return (
    <div className="dash-wrap" dir="rtl">
      {header(
        profile.name,
        `${profile.verified ? '✅ حساب موثّق' : '⏳ بانتظار التوثيق من الإدارة'}${
          profile.service_name || profile.specialty ? ` · ${profile.service_name || profile.specialty}` : ''
        }`,
      )}
      {errorBox}

      {/* Stat Cards */}
      <section className="dash-stats-row">
        {statCards.map((card) => (
          <div className="dash-stat-card" key={card.label}>
            <div className="dash-stat-icon" style={{ background: card.accent }}>
              {card.icon}
            </div>
            <div>
              <p className="dash-stat-label">{card.label}</p>
              <p className="dash-stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        {/* Requests needing approval */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>طلبات تحتاج موافقتك</h3>
          </div>
          {needsApproval.length === 0 ? (
            <p className="dash-empty">لا توجد طلبات جديدة حالياً</p>
          ) : (
            <ul className="dash-list">
              {needsApproval.map((r) => (
                <li key={r.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">#{r.id} — {r.service_name}</p>
                    <p className="dash-list-sub">
                      {r.customer_name} · {r.location || 'بدون موقع'}
                      {r.scheduled_at ? ` · ${formatWhen(r.scheduled_at)}` : ''}
                    </p>
                    {r.description && <p className="dash-list-sub">{r.description}</p>}
                  </div>
                  <div className="dash-actions">
                    <button type="button" className="dash-btn dash-btn-accept" disabled={busyId === r.id} onClick={() => changeStatus(r, 'accepted')}>
                      قبول
                    </button>
                    <button type="button" className="dash-btn dash-btn-reject" disabled={busyId === r.id} onClick={() => changeStatus(r, 'rejected')}>
                      رفض
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* In-progress appointments with progress bar from backend */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>مواعيدك</h3>
          </div>
          {inProgress.length === 0 ? (
            <p className="dash-empty">لا توجد مواعيد حالياً</p>
          ) : (
            <ul className="dash-list">
              {inProgress.map((r) => {
                const steps = r.progress || [];
                const activeIndex = Math.max(0, steps.findIndex((s) => s.active));
                const pct = steps.length ? ((activeIndex + 1) / steps.length) * 100 : 0;
                const next = r.status === 'accepted'
                  ? { status: 'in_progress', label: 'بدء التنفيذ' }
                  : { status: 'completed', label: 'إكمال' };
                return (
                  <li key={r.id} className="dash-progress-item">
                    <div className="dash-progress-top">
                      <p className="dash-request-title">#{r.id} — {r.service_name}</p>
                      <span className="dash-progress-label">{steps[activeIndex]?.label}</span>
                    </div>
                    <p className="dash-list-sub">
                      {r.customer_name} · {r.location || 'بدون موقع'}
                      {r.scheduled_at ? ` · ${formatWhen(r.scheduled_at)}` : ''}
                    </p>
                    <div className="dash-progress-track">
                      <div className="dash-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="dash-actions" style={{ marginTop: 8 }}>
                      <button type="button" className="dash-btn dash-btn-primary" disabled={busyId === r.id} onClick={() => changeStatus(r, next.status)}>
                        {next.label}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Building trend line chart — الباكند يرجع {buildings, data: [{month_label, <بناية>: عدد}]} */}
      {trend.buildings?.length > 0 && (
        <section className="dash-card dash-card-wide">
          <div className="dash-card-header">
            <h3>الطلبات الشهرية حسب المبنى</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" />
              <XAxis dataKey="month_label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {trend.buildings.map((building, i) => (
                <Line
                  key={building}
                  type="monotone"
                  dataKey={building}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Reviews received */}
      <section className="dash-card dash-card-wide">
        <div className="dash-card-header">
          <h3>التقييمات المستلمة</h3>
        </div>
        {reviews.length === 0 ? (
          <p className="dash-empty">لا توجد تقييمات بعد</p>
        ) : (
          <ul className="dash-review-list">
            {reviews.map((rv) => (
              <li key={rv.id} className="dash-review-item">
                <div>
                  <p className="dash-request-title">{rv.customer_name} · {rv.service_name}</p>
                  <p className="dash-request-sub">{rv.comment || 'بدون تعليق'}</p>
                </div>
                <span className="dash-review-rating">{'⭐'.repeat(rv.rating)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
