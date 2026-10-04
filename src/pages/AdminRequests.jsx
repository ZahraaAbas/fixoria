import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Building2, ClipboardList, DoorOpen, Search, User, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { getRequestsOverview } from '../services/adminService'
import { statusKey, statusTone } from '../utils/requestStatus'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import MediaGallery from '../components/ui/MediaGallery'
import { spring } from '../components/ui/motion'
import './AdminRequests.css'

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled']

function AdminRequests() {
  const reduceMotion = useReducedMotion()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let isCancelled = false

    getRequestsOverview()
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
  }, [attempt])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  const filtered = requests.filter((request) => {
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
    if (status === 'all') return requests.length
    return requests.filter((request) => statusKey(request.status) === status).length
  }

  return (
    <section>
      <PageHeader title={translate('adminRequests.title')} />

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
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminRequests
