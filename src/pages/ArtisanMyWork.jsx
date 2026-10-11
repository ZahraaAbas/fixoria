import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Banknote,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Eye,
  Paperclip,
  Play,
  Search,
  X,
} from 'lucide-react'
import { translate } from '../i18n'
import { getRequestsForArtisan, startRequest, completeRequest, confirmCashReceived } from '../services/requestsService'
import { useLoader } from '../hooks/useLoader'
import { formatIQD } from '../utils/money'
import { formatDateTime, parseApiDate } from '../utils/formatDate'
import { statusTone } from '../utils/requestStatus'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import ActionError from '../components/ui/ActionError'
import RequestDrawer from '../components/dashboard/RequestDrawer'
import '../components/dashboard/Dashboard.css'
import './ArtisanMyWork.css'

// المراحل حسب سير العمل؛ "مغلقة" = ملغاة أو مرفوضة
const TABS = [
  { key: 'accepted', statuses: ['accepted'] },
  { key: 'in_progress', statuses: ['in_progress'] },
  { key: 'completed', statuses: ['completed'] },
  { key: 'closed', statuses: ['cancelled', 'rejected'] },
]

const time = (value) => (value ? parseApiDate(value).getTime() : 0)

// ترتيب كل مرحلة: الشغل الجاي حسب أقرب موعد، والمنتهي من الأحدث
function sortForTab(list, tab) {
  if (tab === 'accepted' || tab === 'in_progress') {
    return [...list].sort((a, b) => (time(a.scheduledAt) || Infinity) - (time(b.scheduledAt) || Infinity))
  }
  if (tab === 'completed') return [...list].sort((a, b) => time(b.completedAt) - time(a.completedAt))
  return [...list].sort((a, b) => time(b.createdAt) - time(a.createdAt))
}

function tabOf(status) {
  return TABS.find((t) => t.statuses.includes(status))?.key || 'closed'
}

function ArtisanMyWork() {
  const reduceMotion = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const { data, error, isLoading, retry } = useLoader(getRequestsForArtisan)
  // التعديلات المحلية بعد كل إجراء (بدل إعادة تحميل القائمة كلها)
  const [updates, setUpdates] = useState({})
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')
  const [moved, setMoved] = useState(null)
  // الطلب الي الحرفي ديكتب سعره قبل الإكمال
  const [pricingId, setPricingId] = useState(null)
  const [price, setPrice] = useState('')
  const [priceError, setPriceError] = useState('')

  const requests = useMemo(() => (data || []).map((r) => updates[r.id] || r), [data, updates])
  const counts = Object.fromEntries(TABS.map((t) => [t.key, requests.filter((r) => t.statuses.includes(r.status)).length]))
  const defaultTab = ['in_progress', 'accepted', 'completed', 'closed'].find((key) => counts[key] > 0) || 'accepted'
  const tab = TABS.some((t) => t.key === params.get('stage')) ? params.get('stage') : defaultTab
  const q = params.get('q') || ''
  const service = params.get('service') || ''
  const unpaidOnly = params.get('pay') === 'unpaid'
  const openId = params.get('open') || ''

  function update(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value == null || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  const serviceName = service ? requests.find((r) => String(r.serviceId) === service)?.categoryName : null
  const term = q.trim().toLowerCase().replace(/^#/, '')
  const shown = sortForTab(
    requests.filter((r) => {
      if (!TABS.find((t) => t.key === tab).statuses.includes(r.status)) return false
      if (service && String(r.serviceId) !== service) return false
      if (unpaidOnly && !(r.price != null && r.paymentStatus !== 'paid')) return false
      if (!term) return true
      return [String(r.id), r.title, r.categoryName, r.building, r.apartment, r.residentName, r.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    }),
    tab,
  )
  const openRequest = openId ? requests.find((r) => String(r.id) === openId) : null

  // يغيّر حالة الطلب ويعرض رسالة إن فشل الطلب بدل أن يعلق الزر
  async function runStatusChange(id, action) {
    setActioningId(id)
    setActionError('')
    setMoved(null)
    try {
      const updated = await action(id)
      setUpdates((current) => ({ ...current, [id]: updated }))
      const target = tabOf(updated.status)
      if (target !== tab) setMoved({ id, tab: target })
      return true
    } catch {
      setActionError('common.actionError')
      return false
    } finally {
      setActioningId(null)
    }
  }

  function openPricing(id) {
    setPricingId(id)
    setPrice('')
    setPriceError('')
  }

  async function handleComplete(event, id) {
    event.preventDefault()
    const amount = Number(price)
    if (price.trim() === '' || !Number.isInteger(amount) || amount < 0) {
      setPriceError('payments.priceRequired')
      return
    }
    if (await runStatusChange(id, (requestId) => completeRequest(requestId, amount))) setPricingId(null)
  }

  return (
    <section className="mw">
      <PageHeader title={translate('artisanMyWork.title')} meta={translate('artisanWorkspace.myWorkSubtitle')} />

      <div className="mw-toolbar">
        <div className="tabs" role="tablist" aria-label={translate('artisanMyWork.title')}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`mw-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="mw-panel"
              className="tab"
              onClick={() => {
                setMoved(null)
                update({ stage: t.key, pay: null })
              }}
            >
              {translate(`artisanWorkspace.tabs.${t.key}`)}
              {!isLoading && <span className="tab-count">{counts[t.key]}</span>}
            </button>
          ))}
        </div>

        <label className="mw-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{translate('artisanWorkspace.search')}</span>
          <input
            type="search"
            className="fx-input"
            placeholder={translate('artisanWorkspace.search')}
            value={q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>
      </div>

      {(serviceName || unpaidOnly) && (
        <div className="fchips">
          {serviceName && <span className="fchip">{serviceName}</span>}
          {unpaidOnly && <span className="fchip">{translate('artisanWorkspace.unpaidOnly')}</span>}
          <button type="button" className="fchip-clear" onClick={() => update({ service: null, pay: null })}>
            <X size={14} aria-hidden="true" />
            {translate('analytics.chips.clear')}
          </button>
        </div>
      )}

      <ActionError messageKey={actionError} className="mw-error" />

      <AnimatePresence>
        {moved && (
          <motion.p
            className="flash"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          >
            <CircleCheck size={17} aria-hidden="true" />
            {translate('artisanWorkspace.moved')
              .replace('{id}', moved.id)
              .replace('{stage}', translate(`artisanWorkspace.tabs.${moved.tab}`))}
            <button
              type="button"
              className="mw-flash-link"
              onClick={() => {
                update({ stage: moved.tab, pay: null })
                setMoved(null)
              }}
            >
              {translate('artisanWorkspace.goThere')}
            </button>
          </motion.p>
        )}
      </AnimatePresence>

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('artisanMyWork.loading')}
          </p>
          <SkeletonList count={4} />
        </>
      )}

      {!isLoading && error && (
        <ErrorState message={translate('artisanMyWork.error')} onRetry={retry} retryLabel={translate('artisanMyWork.retry')} />
      )}

      {!isLoading && !error && (
        <div id="mw-panel" role="tabpanel" aria-labelledby={`mw-tab-${tab}`}>
          {shown.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={translate(requests.length === 0 ? 'artisanMyWork.empty' : `artisanWorkspace.emptyTab.${tab}`)}
            />
          ) : (
            <ul className="mw-list">
              {shown.map((request) => {
                const isBusy = actioningId === request.id
                const attachments = request.images.length + (request.audio ? 1 : 0)
                return (
                  <motion.li
                    key={request.id}
                    layout={reduceMotion ? false : 'position'}
                    className={`mw-card mw-card--${statusTone(request.status)} fx-card`}
                  >
                    <div className="mw-card-inner">
                      <div className="mw-card-main">
                        <p className="mw-card-title">
                          <span className="mw-card-id">#{request.id}</span> {request.title || request.categoryName}
                        </p>
                        <p className="mw-card-meta">
                          <span className="fx-badge fx-badge--plain">{request.categoryName}</span>
                          <span className="mw-card-place">
                            <Building2 size={14} aria-hidden="true" />
                            {[request.building, request.apartment].filter(Boolean).join(' · ')}
                          </span>
                          {request.scheduledAt && tab !== 'completed' && tab !== 'closed' && (
                            <span className="mw-card-place">
                              <CalendarClock size={14} aria-hidden="true" />
                              {formatDateTime(request.scheduledAt)}
                            </span>
                          )}
                          {attachments > 0 && (
                            <span className="mw-card-place">
                              <Paperclip size={14} aria-hidden="true" />
                              {attachments}
                            </span>
                          )}
                        </p>
                        {request.description && <p className="mw-card-description">{request.description}</p>}
                        <button type="button" className="mw-details" onClick={() => update({ open: request.id })}>
                          <Eye size={14} aria-hidden="true" />
                          {translate('artisanWorkspace.details')}
                        </button>
                      </div>

                      {request.status === 'accepted' && (
                        <button
                          type="button"
                          className="fx-btn fx-btn--dark mw-card-action"
                          onClick={() => runStatusChange(request.id, startRequest)}
                          disabled={isBusy}
                          data-loading={isBusy || undefined}
                        >
                          <Play size={16} aria-hidden="true" />
                          {translate('artisanMyWork.start')}
                        </button>
                      )}

                      {request.status === 'in_progress' && pricingId !== request.id && (
                        <button type="button" className="fx-btn fx-btn--primary mw-card-action" onClick={() => openPricing(request.id)}>
                          <CheckCheck size={16} aria-hidden="true" />
                          {translate('artisanMyWork.complete')}
                        </button>
                      )}

                      {request.status === 'in_progress' && pricingId === request.id && (
                        <form className="mw-price" onSubmit={(event) => handleComplete(event, request.id)} noValidate>
                          <label className="mw-price-label" htmlFor={`price-${request.id}`}>
                            {translate('payments.priceLabel')}
                          </label>
                          <input
                            id={`price-${request.id}`}
                            className="fx-input"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1000"
                            value={price}
                            onChange={(event) => {
                              setPrice(event.target.value)
                              setPriceError('')
                            }}
                            aria-invalid={Boolean(priceError) || undefined}
                            autoFocus
                          />
                          {priceError && <p className="mw-price-error">{translate(priceError)}</p>}
                          <div className="mw-price-actions">
                            <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={isBusy} data-loading={isBusy || undefined}>
                              <CheckCheck size={15} aria-hidden="true" />
                              {translate('payments.confirmComplete')}
                            </button>
                            <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => setPricingId(null)}>
                              <X size={15} aria-hidden="true" />
                              {translate('payments.cancel')}
                            </button>
                          </div>
                        </form>
                      )}

                      {request.status === 'completed' && request.price != null && (
                        <div className="mw-pay">
                          <strong className="mw-pay-amount">{formatIQD(request.price)}</strong>
                          {request.paymentStatus === 'paid' ? (
                            <span className="fx-badge fx-badge--completed">
                              {translate('payments.paid')}
                              {request.paymentMethod && ` · ${translate(`payments.method.${request.paymentMethod}`)}`}
                            </span>
                          ) : (
                            <>
                              <span className="fx-badge fx-badge--rejected">{translate('payments.unpaidBadge')}</span>
                              <button
                                type="button"
                                className="fx-btn fx-btn--secondary fx-btn--sm"
                                onClick={() => runStatusChange(request.id, confirmCashReceived)}
                                disabled={isBusy}
                                data-loading={isBusy || undefined}
                              >
                                <Banknote size={15} aria-hidden="true" />
                                {translate('payments.cashReceived')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <RequestDrawer request={openRequest} onClose={() => update({ open: null })} />
    </section>
  )
}

export default ArtisanMyWork
