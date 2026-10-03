import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, X, CheckCircle2, Loader2 } from 'lucide-react'
import { apiFetch } from '../services/api'
import { analyzeServiceRequest } from '../services/aiService'

/**
 * المساعد الذكي لطلب الخدمة (لوحة الساكن).
 * الخطوات: الساكن يوصف المشكلة → الباكند يحلل ويرجّع مسودة → ملخص مع (تأكيد / تعديل)
 * → عند التأكيد نستخدم نفس POST /resident/requests اللي يستخدمه الطلب اليدوي
 * (تعيين الحرفي + إشعار الحرفي والساكن يصيرون هناك).
 */

const GREETING = 'هلا! اكتب لي شنو المشكلة وأنا أحضّر الطلب، وتراجعه قبل ما أرسله.'
const PRIORITY_LABEL = { normal: 'عادي', urgent: 'عاجل' }

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400'

function formatTime(value) {
  if (!value) return 'غير محدد'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? 'غير محدد'
    : d.toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
}

function errorText(e) {
  if (e.message === 'NETWORK_ERROR') return 'تعذّر الاتصال بالخادم — تأكد أن الباكند شغّال'
  return e.detail || 'صار خطأ، حاول مرة ثانية'
}

// الأولوية والتفاصيل ما عدهم عمود بالـ DB، نضمّهم لنص الوصف حتى يوصلون للحرفي
function buildDescription(draft) {
  const parts = [draft.problem, ...(draft.additional_details || [])]
  if (draft.priority === 'urgent') parts.push('الأولوية: عاجل')
  return parts.join(' — ')
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex gap-2 text-sm py-1">
      <span className="text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium">{children}</span>
    </div>
  )
}

export default function AiAssistantModal({ profile, categories, onClose, onCreated }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [created, setCreated] = useState(null)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, draft])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    // نرسل المحادثة السابقة (بدون رسالة الترحيب) حتى يفهم المساعد الردود المكملة
    const history = messages.slice(1).map(({ role, content }) => ({ role, content }))
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setBusy(true)
    setError('')
    setEditing(false)
    try {
      const res = await analyzeServiceRequest(text, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.assistant_message }])
      setDraft(res.status === 'ready' ? res.request : null)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!draft?.service_id || !(draft.problem || '').trim()) return setError('لازم تحدد نوع الخدمة ووصف المشكلة')
    if (draft.preferred_time && new Date(draft.preferred_time) < new Date()) {
      return setError('الوقت المناسب لازم يكون بالمستقبل')
    }
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('service_id', String(draft.service_id))
      fd.append('description', buildDescription(draft))
      if (profile?.name) fd.append('contact_name', profile.name)
      if (draft.preferred_time) fd.append('scheduled_at', new Date(draft.preferred_time).toISOString())
      setCreated(await apiFetch('/resident/requests', { method: 'POST', body: fd }))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const patchDraft = (changes) => setDraft((d) => ({ ...d, ...changes }))
  const onServiceChange = (e) => {
    const id = Number(e.target.value)
    const cat = categories.find((c) => c.service_id === id)
    if (cat) patchDraft({ service_id: id, service_name: cat.name })
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        role="dialog"
        aria-label="المساعد الذكي"
        className="bg-white rounded-xl shadow-xl w-full max-w-md my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" /> المساعد الذكي
          </h2>
          <button onClick={onClose} aria-label="إغلاق" className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} />
            <div className="font-bold text-slate-800 mb-1">تم إرسال طلبك رقم #{created.id}</div>
            <p className="text-sm text-slate-500 mb-5">
              {created.artisan_name
                ? `تم تحويله للحرفي ${created.artisan_name} — بانتظار القبول`
                : 'جاري البحث عن حرفي مناسب، وراح توصلك إشعارات بكل تحديث'}
            </p>
            <button
              onClick={() => onCreated(created)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-bold"
            >
              متابعة الطلب
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && !draft && (
                <div className="flex justify-end">
                  <div className="bg-slate-100 text-slate-500 rounded-xl px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> جارِ تحليل طلبك...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {draft && !editing && (
              <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 mb-4">
                <div className="font-bold text-slate-800 text-sm mb-2">ملخص الطلب</div>
                <SummaryRow label="الخدمة">{draft.service_name}</SummaryRow>
                <SummaryRow label="المشكلة">{draft.problem}</SummaryRow>
                <SummaryRow label="الأولوية">{PRIORITY_LABEL[draft.priority] || 'عادي'}</SummaryRow>
                <SummaryRow label="الوقت المناسب">{formatTime(draft.preferred_time)}</SummaryRow>
                {draft.additional_details.length > 0 && (
                  <SummaryRow label="تفاصيل">{draft.additional_details.join('، ')}</SummaryRow>
                )}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={confirm}
                    disabled={busy}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-60"
                  >
                    {busy ? 'جارِ الإرسال...' : 'تأكيد الطلب'}
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    disabled={busy}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg py-2 text-sm font-bold"
                  >
                    تعديل
                  </button>
                </div>
              </div>
            )}

            {draft && editing && (
              <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">نوع الخدمة</span>
                  <select className={inputCls} value={draft.service_id} onChange={onServiceChange}>
                    {categories.map((c) => (
                      <option key={c.service_id} value={c.service_id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-600 mb-1">وصف المشكلة</span>
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={draft.problem}
                    onChange={(e) => patchDraft({ problem: e.target.value })}
                  />
                </label>
                <div className="flex gap-2">
                  <label className="block flex-1">
                    <span className="block text-sm text-slate-600 mb-1">الأولوية</span>
                    <select className={inputCls} value={draft.priority} onChange={(e) => patchDraft({ priority: e.target.value })}>
                      <option value="normal">عادي</option>
                      <option value="urgent">عاجل</option>
                    </select>
                  </label>
                  <label className="block flex-1">
                    <span className="block text-sm text-slate-600 mb-1">الوقت المناسب</span>
                    <input
                      type="datetime-local"
                      className={inputCls}
                      value={draft.preferred_time || ''}
                      onChange={(e) => patchDraft({ preferred_time: e.target.value || null })}
                    />
                  </label>
                </div>
                <button
                  onClick={() => setEditing(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>
            )}

            {error && <p className="text-rose-600 text-xs mb-3" role="alert">{error}</p>}

            <div className="flex gap-2">
              <input
                className={inputCls}
                value={input}
                maxLength={1000}
                placeholder="مثال: حنفية المطبخ تسرّب وأريد أحد يجي اليوم"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                aria-label="إرسال"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 disabled:opacity-50"
              >
                <Send size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
