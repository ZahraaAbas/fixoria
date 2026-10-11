import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CircleCheck, ClipboardList, MessageSquareWarning, Search, Send, User } from 'lucide-react'
import { translate } from '../i18n'
import { useLoader } from '../hooks/useLoader'
import { getComplaints, updateComplaint } from '../services/complaintsService'
import { formatDateTime, parseApiDate } from '../utils/formatDate'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import ActionError from '../components/ui/ActionError'
import '../components/dashboard/Dashboard.css'
import './AdminComplaints.css'

const STATUSES = ['open', 'in_review', 'resolved']
const TABS = [...STATUSES, 'all']
const BADGE = { open: 'fx-badge--rejected', in_review: 'fx-badge--accepted', resolved: 'fx-badge--completed' }

// بطاقة شكوى: الرد وتغيير الحالة بنفس المكان، والساكن يوصله إشعار بعد الحفظ
function ComplaintCard({ complaint, onSaved }) {
  const [status, setStatus] = useState(complaint.status)
  const [reply, setReply] = useState(complaint.reply)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const changed = status !== complaint.status || reply.trim() !== complaint.reply.trim()

  async function save(event) {
    event.preventDefault()
    setIsBusy(true)
    setError('')
    setSaved(false)
    try {
      onSaved(await updateComplaint(complaint.id, { status, reply: reply.trim() }))
      setSaved(true)
    } catch {
      setError('common.actionError')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <li className={`acp-card acp-card--${complaint.status} fx-card`}>
      <div className="acp-head">
        <div>
          <p className="acp-id">#{complaint.id}</p>
          <h2 className="acp-subject">{complaint.subject}</h2>
        </div>
        <span className={`fx-badge ${BADGE[complaint.status]}`}>{translate(`adminComplaints.status.${complaint.status}`)}</span>
      </div>

      <p className="acp-meta">
        <span>
          <User size={14} aria-hidden="true" />
          {complaint.residentName || '—'}
        </span>
        <span>{formatDateTime(complaint.createdAt)}</span>
        {complaint.requestId && (
          <Link to={`/admin/requests?open=${complaint.requestId}`} className="acp-request">
            <ClipboardList size={14} aria-hidden="true" />
            {translate('adminComplaints.request').replace('{id}', complaint.requestId)}
          </Link>
        )}
      </p>

      <p className="acp-message">{complaint.message}</p>

      <form className="acp-form" onSubmit={save}>
        <label className="acp-field">
          <span className="fx-label">{translate('adminComplaints.reply')}</span>
          <textarea
            className="fx-input acp-reply"
            rows={3}
            value={reply}
            placeholder={translate('adminComplaints.replyPlaceholder')}
            onChange={(event) => {
              setReply(event.target.value)
              setSaved(false)
            }}
          />
        </label>
        <div className="acp-actions">
          <label className="acp-status">
            <span className="fx-label">{translate('adminComplaints.statusLabel')}</span>
            <select
              className="fx-input"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setSaved(false)
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {translate(`adminComplaints.status.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={!changed || isBusy} data-loading={isBusy || undefined}>
            <Send size={15} aria-hidden="true" />
            {translate('adminComplaints.save')}
          </button>
        </div>
        {saved && (
          <p className="flash" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            {translate('adminComplaints.saved')}
          </p>
        )}
        <ActionError messageKey={error} />
      </form>
      {complaint.updatedAt && (
        <p className="acp-updated">{translate('adminComplaints.updated').replace('{date}', formatDateTime(complaint.updatedAt))}</p>
      )}
    </li>
  )
}

function AdminComplaints() {
  const { data, error, isLoading, retry } = useLoader(getComplaints)
  const [updates, setUpdates] = useState({})
  // لما الشكوى تنتقل لتبويب ثاني بعد الحفظ، نخبر المشرف وين راحت
  const [moved, setMoved] = useState(null)
  const [params, setParams] = useSearchParams()
  const complaints = useMemo(() => (data || []).map((c) => updates[c.id] || c), [data, updates])
  const counts = Object.fromEntries(TABS.map((t) => [t, t === 'all' ? complaints.length : complaints.filter((c) => c.status === t).length]))
  const defaultTab = counts.open > 0 ? 'open' : counts.in_review > 0 ? 'in_review' : 'all'
  const tab = TABS.includes(params.get('status')) ? params.get('status') : defaultTab
  const q = params.get('q') || ''

  function update(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (!value) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  const term = q.trim().toLowerCase().replace(/^#/, '')
  // الأقدم أولًا بالمفتوحة (حتى ما تنسى)، والأحدث أولًا بالباقي
  const shown = complaints
    .filter((c) => tab === 'all' || c.status === tab)
    .filter(
      (c) =>
        !term ||
        [String(c.id), c.subject, c.message, c.residentName, c.requestId && String(c.requestId)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
    )
    .sort((a, b) => (tab === 'open' ? 1 : -1) * (parseApiDate(a.createdAt) - parseApiDate(b.createdAt)))

  return (
    <section className="acp">
      <PageHeader title={translate('adminComplaints.title')} meta={translate('adminComplaints.subtitle')} />

      <div className="acp-toolbar">
        <div className="tabs" role="tablist" aria-label={translate('adminComplaints.title')}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`acp-tab-${t}`}
              aria-selected={tab === t}
              aria-controls="acp-panel"
              className="tab"
              onClick={() => {
                setMoved(null)
                update({ status: t })
              }}
            >
              {translate(t === 'all' ? 'adminComplaints.all' : `adminComplaints.status.${t}`)}
              {!isLoading && <span className="tab-count">{counts[t]}</span>}
            </button>
          ))}
        </div>
        <label className="acp-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{translate('adminComplaints.search')}</span>
          <input
            type="search"
            className="fx-input"
            placeholder={translate('adminComplaints.search')}
            value={q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>
      </div>

      {moved && (
        <p className="flash" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          {translate('adminComplaints.moved')
            .replace('{id}', moved.id)
            .replace('{status}', translate(`adminComplaints.status.${moved.status}`))}
        </p>
      )}

      {isLoading && <SkeletonList count={3} />}
      {error && <ErrorState message={translate('owner.common.loadError')} onRetry={retry} retryLabel={translate('owner.common.retry')} />}

      {!isLoading && !error && (
        <div id="acp-panel" role="tabpanel" aria-labelledby={`acp-tab-${tab}`}>
          {shown.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title={translate(complaints.length === 0 ? 'adminComplaints.empty' : 'adminComplaints.emptyTab')}
            />
          ) : (
            <ul className="acp-list">
              {shown.map((c) => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  onSaved={(saved) => {
                    setUpdates((current) => ({ ...current, [saved.id]: saved }))
                    setMoved(tab !== 'all' && saved.status !== tab ? saved : null)
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default AdminComplaints
