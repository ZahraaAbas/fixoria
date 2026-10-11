import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Building2, ClipboardList, DoorOpen, Filter, Search, User, Wrench, X } from 'lucide-react'
import { translate } from '../i18n'
import { getRequestsOverview } from '../services/adminService'
import { statusKey, statusTone } from '../utils/requestStatus'
import { parseApiDate } from '../utils/formatDate'
import { resolveRange, STATUS_GROUPS } from '../analytics/requests'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import MediaGallery from '../components/ui/MediaGallery'
import AudioNote from '../components/ui/AudioNote'
import { spring } from '../components/ui/motion'
import './AdminRequests.css'

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled']

// فلاتر جاية من الرابط (من أرقام ورسوم لوحة التحكم): الفترة، الخدمة، المجمع، ومجموعة حالات
function readUrlFilters(params) {
  const preset = params.get('range')
  const range = preset && preset !== 'all' ? resolveRange({ preset, from: params.get('from'), to: params.get('to') }) : null
  const status = params.get('status')
  return {
    range,
    // by=completed: الفترة تنحسب على تاريخ الإكمال بدل تاريخ الإنشاء
    byCompleted: params.get('by') === 'completed',
    service: params.get('service'),
    compound: params.get('compound'),
    statusGroup: status && STATUS_GROUPS[status] && status !== 'pending' && status !== 'completed' ? status : null,
    status: status && STATUS_FILTERS.includes(status) ? status : 'all',
  }
}

function matchesUrlFilters(request, url) {
  if (url.service && String(request.serviceId) !== url.service) return false
  if (url.compound && String(request.compoundId) !== url.compound) return false
  if (url.statusGroup && !STATUS_GROUPS[url.statusGroup].includes(statusKey(request.status))) return false
  if (url.range) {
    const value = url.byCompleted ? request.completedAt : request.createdAt
    if (!value) return false
    const date = parseApiDate(value)
    if (date < url.range.start || date >= url.range.end) return false
  }
  return true
}

// المشرف يشوف طلبات مجمعه، ومدير الشركة يشوف طلبات حرفيي شركته (loader و titleKey)
function AdminRequests({ loader = getRequestsOverview, titleKey = 'adminRequests.title' }) {
  const reduceMotion = useReducedMotion()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [params, setParams] = useSearchParams()
  const url = readUrlFilters(params)
  const [statusFilter, setStatusFilter] = useState(url.status)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let isCancelled = false

    loader()
      .then((data) => {
        if (!isCancelled) setRequests(data)
      })
      .catch((err) => {
        if (!isCancelled) setError(err)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [attempt, loader])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  const scoped = requests.filter((request) => matchesUrlFilters(request, url))
  const chips = [
    url.range && {
      key: 'range',
      label: translate(url.byCompleted ? 'analytics.chips.completedIn' : 'analytics.chips.createdIn').replace(
        '{range}',
        params.get('range') === 'custom'
          ? `${params.get('from')} — ${params.get('to')}`
          : translate(`analytics.range.last${url.range.days}`),
      ),
    },
    url.service && { key: 'service', label: requests.find((r) => String(r.serviceId) === url.service)?.categoryName || url.service },
    url.compound && { key: 'compound', label: requests.find((r) => String(r.compoundId) === url.compound)?.compoundName || url.compound },
    url.statusGroup && { key: 'status', label: translate(`analytics.chips.${url.statusGroup}`) },
  ].filter(Boolean)

  function clearUrlFilters() {
    setParams({}, { replace: true })
    setStatusFilter('all')
  }

  const filtered = scoped.filter((request) => {
    const status = statusKey(request.status)
    if (statusFilter !== 'all' && status !== statusFilter) return false

    const term = searchTerm.trim().toLowerCase()
    if (!term) return true

    return (
      (request.title || '').toLowerCase().includes(term) ||
      (request.categoryName || '').toLowerCase().includes(term) ||
      (request.residentName || '').toLowerCase().includes(term) ||
      (request.artisanName || '').toLowerCase().includes(term)
    )
  })

  // عدد الطلبات في كل حالة (للعرض على أزرار التصفية)
  function countFor(status) {
    if (status === 'all') return scoped.length
    return scoped.filter((request) => statusKey(request.status) === status).length
  }

  return (
    <section>
      <PageHeader title={translate(titleKey)} />

      <div className="arq-toolbar fx-card">
        <label className="arq-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{translate('adminRequests.searchPlaceholder')}</span>
          <input
            type="search"
            className="fx-input"
            placeholder={translate('adminRequests.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        {chips.length > 0 && (
          <div className="arq-chips">
            <Filter size={15} aria-hidden="true" />
            {chips.map((chip) => (
              <span key={chip.key} className="arq-chip">
                {chip.label}
              </span>
            ))}
            <button type="button" className="arq-chip-clear" onClick={clearUrlFilters}>
              <X size={14} aria-hidden="true" />
              {translate('analytics.chips.clear')}
            </button>
          </div>
        )}

        <div className="arq-filters" role="group" aria-label={translate('adminRequests.title')}>
          {STATUS_FILTERS.map((status) => {
            const isActive = statusFilter === status
            return (
              <button
                key={status}
                type="button"
                className={`arq-filter ${isActive ? 'is-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => setStatusFilter(status)}
              >
                {isActive && (
                  <motion.span
                    layoutId="arq-filter-pill"
                    className="arq-filter-pill"
                    transition={reduceMotion ? { duration: 0 } : spring}
                  />
                )}
                {translate(`adminRequests.filters.${status}`)}
                {!isLoading && <span className="arq-filter-count">{countFor(status)}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('adminRequests.loading')}
          </p>
          <SkeletonList count={4} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminRequests.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminRequests.retry')}
        />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState icon={ClipboardList} title={translate('adminRequests.empty')} />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <ul className="arq-grid">
          {filtered.map((request) => (
            <motion.li
              key={request.id}
              layout={!reduceMotion ? 'position' : false}
              transition={spring}
              className={`arq-card arq-card--${statusTone(request.status)} fx-card`}
            >
              <div className="arq-card-head">
                <p className="arq-card-title">{request.title || request.categoryName}</p>
                <StatusBadge status={request.status} />
              </div>
              <span className="fx-badge fx-badge--plain arq-category">{request.categoryName}</span>

              <dl className="arq-people">
                <div>
                  <dt>
                    <User size={14} aria-hidden="true" />
                    {translate('adminRequests.resident')}
                  </dt>
                  <dd>{request.residentName}</dd>
                </div>
                {request.artisanName && (
                  <div>
                    <dt>
                      <Wrench size={14} aria-hidden="true" />
                      {translate('adminRequests.artisan')}
                    </dt>
                    <dd>{request.artisanName}</dd>
                  </div>
                )}
              </dl>

              <p className="arq-place">
                <span>
                  <Building2 size={14} aria-hidden="true" />
                  {translate('adminRequests.building')}: <strong>{request.building}</strong>
                </span>
                <span>
                  <DoorOpen size={14} aria-hidden="true" />
                  {translate('adminRequests.apartment')}: <strong>{request.apartment}</strong>
                </span>
              </p>

              {request.description && <p className="arq-description">{request.description}</p>}
              {request.images.length > 0 && (
                <MediaGallery images={request.images} label={translate('requestDetail.photos')} size="sm" />
              )}
              <AudioNote src={request.audio} />
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminRequests
