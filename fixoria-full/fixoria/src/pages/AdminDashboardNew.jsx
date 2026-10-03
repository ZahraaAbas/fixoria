import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { apiFetch } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import './AdminDashboardNew.css';
import './DashboardShared.css';

const STATUS_COLORS = {
  pending: '#94a3b8',
  accepted: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  rejected: '#ef4444',
};

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  accepted: 'مقبولة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
  rejected: 'مرفوضة',
};

const COMPLAINT_STATUS = { open: 'مفتوحة', in_review: 'قيد المتابعة', resolved: 'تم الحل' };

export default function AdminDashboardNew() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [services, setServices] = useState([]);
  const [pendingArtisans, setPendingArtisans] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    return Promise.all([
      apiFetch('/admin/stats'),
      apiFetch('/admin/artisans/activity'),
      apiFetch('/admin/services/stats'),
      apiFetch('/admin/artisans?verified=false'),
      apiFetch('/admin/complaints'),
    ])
      .then(([statsData, activityData, servicesData, pendingData, complaintsData]) => {
        setStats(statsData);
        setActivity(activityData);
        setServices(servicesData);
        setPendingArtisans(pendingData);
        setComplaints(complaintsData);
      })
      .catch((err) => setError(err.message === 'NETWORK_ERROR' ? 'تعذّر الاتصال بالخادم' : err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function verifyArtisan(id, approve) {
    setBusyId(`a${id}`);
    try {
      await apiFetch(`/admin/artisans/${id}/verify?approve=${approve}`, { method: 'PUT' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function updateComplaint(c, status) {
    const reply = status === 'resolved' ? window.prompt('رد الإدارة على الساكن (اختياري):', c.admin_reply || '') : null;
    setBusyId(`c${c.id}`);
    try {
      await apiFetch(`/admin/complaints/${c.id}`, {
        method: 'PUT',
        body: { status, ...(reply ? { admin_reply: reply } : {}) },
      });
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
  if (!stats) return <div className="dash-error">حدث خطأ: {error}</div>;

  // الباكند يرجع requests: {pending, accepted, rejected, in_progress, completed, total}
  const requestsByStatus = Object.keys(STATUS_LABELS)
    .map((status) => ({
      name: STATUS_LABELS[status],
      value: stats.requests?.[status] || 0,
      color: STATUS_COLORS[status],
    }))
    .filter((s) => s.value > 0);

  const totalRequests = stats.requests?.total ?? 0;

  const statCards = [
    {
      label: 'إجمالي الحرفيين',
      value: stats.artisans.total,
      sub: `${stats.artisans.verified} موثّق`,
      icon: '🧰',
      accent: '#fef3c7',
    },
    {
      label: 'الحرفيون بانتظار التوثيق',
      value: stats.artisans.pending,
      sub: 'يحتاجون مراجعة',
      icon: '⏳',
      accent: '#fee2e2',
    },
    {
      label: 'السكان',
      value: stats.customers_count,
      sub: 'مسجلين بالمنصة',
      icon: '👥',
      accent: '#dbeafe',
    },
    {
      label: 'متوسط التقييم',
      value: stats.overall_average_rating?.toFixed(1) ?? '—',
      sub: `من 5 · ${stats.total_reviews} تقييم`,
      icon: '⭐',
      accent: '#dcfce7',
    },
  ];

  return (
    <div className="dash-wrap" dir="rtl">
      <header className="dash-header">
        <div className="dash-header-row">
          <div>
            <p className="dash-greeting">أهلاً {user?.fullName} 👋</p>
            <h1 className="dash-title">لوحة تحكم المدير</h1>
            <p className="dash-subtitle">نظرة شاملة على الحرفيين والطلبات والتقييمات</p>
          </div>
          <div className="dash-header-actions">
            <button type="button" className="dash-link-btn" onClick={() => { setLoading(true); load(); }}>تحديث</button>
            <button type="button" className="dash-link-btn dash-link-btn-danger" onClick={handleLogout}>تسجيل الخروج</button>
          </div>
        </div>
      </header>

      {error && (
        <div className="dash-alert" role="alert">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="إغلاق">✕</button>
        </div>
      )}

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
              <p className="dash-stat-sub">{card.sub}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        {/* Donut chart: requests by status */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>الطلبات حسب الحالة</h3>
          </div>
          <div className="dash-donut-row">
            <div className="dash-donut-chart">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={requestsByStatus}
                    dataKey="value"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {requestsByStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="dash-donut-center">
                <span className="dash-donut-total">{totalRequests}</span>
                <span className="dash-donut-caption">إجمالي الطلبات</span>
              </div>
            </div>
            <ul className="dash-legend">
              {requestsByStatus.map((s) => (
                <li key={s.name}>
                  <span className="dash-legend-dot" style={{ background: s.color }} />
                  {s.name}
                  <span className="dash-legend-value">
                    {totalRequests ? Math.round((s.value / totalRequests) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bar chart: artisan activity */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>نشاط الحرفيين</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef1f5" />
              <XAxis dataKey="artisan_name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="today" name="اليوم" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="this_month" name="هذا الشهر" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              <Bar dataKey="this_year" name="هذه السنة" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Service performance */}
      <section className="dash-card dash-card-wide">
        <div className="dash-card-header">
          <h3>أداء الخدمات</h3>
        </div>
        <ul className="dash-list">
          {services.map((s) => (
            <li key={s.service_id} className="dash-list-item">
              <div>
                <p className="dash-list-title">{s.service_name}</p>
                <p className="dash-list-sub">
                  {s.total_requests} طلب · {s.completed_requests} مكتمل · {s.rejected_requests} مرفوض · ⭐ {s.average_rating ?? '—'} ({s.reviews_count})
                </p>
                {s.below_average && <p className="dash-list-warn">⚠️ {s.reason}</p>}
              </div>
              <span className={`dash-chip ${s.below_average ? 'dash-chip-warn' : 'dash-chip-ok'}`}>
                {s.below_average ? 'تحت المتوسط' : 'جيد'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="dash-grid" style={{ marginTop: 20 }}>
        {/* Pending artisans */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>حرفيون بانتظار التوثيق</h3>
          </div>
          {pendingArtisans.length === 0 ? (
            <p className="dash-empty">لا يوجد حرفيون بانتظار التوثيق</p>
          ) : (
            <ul className="dash-list">
              {pendingArtisans.map((a) => (
                <li key={a.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{a.name}</p>
                    <p className="dash-list-sub">{a.specialty} · {a.phone}</p>
                  </div>
                  <div className="dash-actions">
                    <button type="button" className="dash-btn dash-btn-accept" disabled={busyId === `a${a.id}`} onClick={() => verifyArtisan(a.id, true)}>
                      توثيق
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Complaints */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3>شكاوى السكان</h3>
          </div>
          {complaints.length === 0 ? (
            <p className="dash-empty">لا توجد شكاوى</p>
          ) : (
            <ul className="dash-list">
              {complaints.map((c) => (
                <li key={c.id} className="dash-list-item">
                  <div>
                    <p className="dash-list-title">{c.subject}</p>
                    <p className="dash-list-sub">{c.customer_name} · {c.message}</p>
                    {c.admin_reply && <p className="dash-list-sub">الرد: {c.admin_reply}</p>}
                  </div>
                  <div className="dash-actions">
                    <span className="dash-chip">{COMPLAINT_STATUS[c.status] || c.status}</span>
                    {c.status === 'open' && (
                      <button type="button" className="dash-btn dash-btn-primary" disabled={busyId === `c${c.id}`} onClick={() => updateComplaint(c, 'in_review')}>
                        متابعة
                      </button>
                    )}
                    {c.status !== 'resolved' && (
                      <button type="button" className="dash-btn dash-btn-accept" disabled={busyId === `c${c.id}`} onClick={() => updateComplaint(c, 'resolved')}>
                        حل
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
