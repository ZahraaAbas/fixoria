import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Building2, CalendarDays, Check, CircleCheck, DoorOpen, Inbox, Search, X } from 'lucide-react'
import { translate } from '../i18n'
import {
  getAvailableRequestsForArtisan,
  acceptRequest,
  dismissRequestForArtisan,
} from '../services/requestsService'
import { formatDateTime, parseApiDate } from '../utils/formatDate'
import ConfirmDialog from '../components/dashboard/ConfirmDialog'
import '../components/dashboard/Dashboard.css'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import MediaGallery from '../components/ui/MediaGallery'
import AudioNote from '../components/ui/AudioNote'
import { easeOut } from '../components/ui/motion'
import './ArtisanRequests.css'

const SORTS = ['newest', 'oldest', 'soonest']
const time = (value) => (value ? parseApiDate(value).getTime() : 0)

function ArtisanRequests() {
  const reduceMotion = useReducedMotion()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')
  // تأكيد قبل التجاهل (ما يرجع الطلب بعدها)، ورسالة بعد القبول
  const [confirmId, setConfirmId] = useState(null)
  const [accepted, setAccepted] = useState(null)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const service = params.get('service') || ''
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : 'newest'

  function update(changes) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (!value || (key === 'sort' && value === 'newest')) next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    let isCancelled = false

    getAvailableRequestsForArtisan()
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

  async function handleAccept(requestId) {
    setActioningId(requestId)
    setActionError('')
    setAccepted(null)

    try {
      await acceptRequest(requestId)
      setRequests((current) => current.filter((request) => request.id !== requestId))
      setAccepted(requestId)
    } catch {
      setActionError('artisanRequests.alreadyTaken')
      setRequests((current) => current.filter((request) => request.id !== requestId))
    } finally {
      setActioningId(null)
    }
  }

  async function handleDismiss(requestId) {
    setActioningId(requestId)
    setActionError('')
    try {
      await dismissRequestForArtisan(requestId)
      setRequests((current) => current.filter((request) => request.id !== requestId))
      setConfirmId(null)
    } catch {
      setActionError('common.actionError')
      setConfirmId(null)
    } finally {
      setActioningId(null)
    }
  }

  const services = [...new Map(requests.map((r) => [r.serviceId, r.categoryName])).entries()]
  const term = q.trim().toLowerCase().replace(/^#/, '')
  const shown = requests
    .filter((r) => !service || String(r.serviceId) === service)
    .filter(
      (r) =>
        !term ||
        [String(r.id), r.title, r.categoryName, r.description, r.building, r.apartment]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
    )
    .sort((a, b) => {
      if (sort === 'oldest') return time(a.createdAt) - time(b.createdAt)
      if (sort === 'soonest') return (time(a.preferredDate) || Infinity) - (time(b.preferredDate) || Infinity)
      return time(b.createdAt) - time(a.createdAt)
    })
  const confirmRequest = requests.find((r) => r.id === confirmId)

  return (
    <section>
      <PageHeader
        title={translate('artisanRequests.title')}
        meta={
          !isLoading && !error && requests.length > 0 ? (
            <span className="ar-count">
              <span className="ar-count-dot" aria-hidden="true" />
              {requests.length}
            </span>
          ) : null
        }
      />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('artisanRequests.loading')}
          </p>
          <SkeletonList count={4} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('artisanRequests.error')}
          onRetry={handleRetry}
          retryLabel={translate('artisanRequests.retry')}
        />
      )}

      <AnimatePresence>
        {actionError && (
          <motion.p
            className="fx-notice fx-notice--danger ar-alert"
            role="alert"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={18} aria-hidden="true" />
            {translate(actionError)}
          </motion.p>
        )}
      </AnimatePresence>

      {!isLoading && !error && requests.length > 0 && (
        <div className="ar-toolbar">
          <label className="mw-search ar-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{translate('artisanWorkspace.searchAvailable')}</span>
            <input
              type="search"
              className="fx-input"
              placeholder={translate('artisanWorkspace.searchAvailable')}
              value={q}
              onChange={(event) => update({ q: event.target.value })}
            />
          </label>
          {services.length > 1 && (
            <select
              className="fx-input ar-select"
              value={service}
              onChange={(event) => update({ service: event.target.value })}
              aria-label={translate('requestsTable.serviceLabel')}
            >
              <option value="">{translate('requestsTable.allServices')}</option>
              {services.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <select
            className="fx-input ar-select"
            value={sort}
            onChange={(event) => update({ sort: event.target.value })}
            aria-label={translate('artisanWorkspace.sortLabel')}
          >
            {SORTS.map((value) => (
              <option key={value} value={value}>
                {translate(`artisanWorkspace.sort.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}

      <AnimatePresence>
        {accepted && (
          <motion.p
            className="flash ar-flash"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          >
            <CircleCheck size={17} aria-hidden="true" />
            {translate('artisanWorkspace.acceptedFlash').replace('{id}', accepted)}
            <Link to={`/artisan/my-work?stage=accepted&open=${accepted}`} className="mw-flash-link">
              {translate('artisanWorkspace.goThere')}
            </Link>
          </motion.p>
        )}
      </AnimatePresence>

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState icon={Inbox} title={translate('artisanRequests.empty')} />
      )}

      {!isLoading && !error && requests.length > 0 && shown.length === 0 && (
        <EmptyState icon={Search} title={translate('requestsTable.emptyFiltered')} />
      )}

      {!isLoading && !error && shown.length > 0 && (
        <ul className="ar-grid">
          <AnimatePresence initial={!reduceMotion} mode="popLayout">
            {shown.map((request, index) => {
              const isBusy = actioningId === request.id
              return (
                <motion.li
                  key={request.id}
                  layout={!reduceMotion}
                  className="ar-card fx-card"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut, delay: index * 0.05 } }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
                >
                  <div className="ar-card-head">
                    <span className="fx-badge fx-badge--navy fx-badge--plain">{request.categoryName}</span>
                    {request.preferredDate && (
                      <span className="ar-date">
                        <CalendarDays size={14} aria-hidden="true" />
                        <span className="sr-only">{translate('artisanRequests.preferredDate')}: </span>
                        {formatDateTime(request.preferredDate)}
                      </span>
                    )}
                  </div>

                  <p className="ar-title">{request.title || request.categoryName}</p>
                  <p className="ar-description">{request.description}</p>
                  {request.images.length > 0 && (
                    <MediaGallery images={request.images} label={translate('requestDetail.photos')} size="sm" />
                  )}
                  <AudioNote src={request.audio} />

                  <dl className="ar-location">
                    <div>
                      <dt>
                        <Building2 size={14} aria-hidden="true" />
                        {translate('artisanRequests.building')}
                      </dt>
                      <dd>{request.building}</dd>
                    </div>
                    <div>
                      <dt>
                        <DoorOpen size={14} aria-hidden="true" />
                        {translate('artisanRequests.apartment')}
                      </dt>
                      <dd>{request.apartment}</dd>
                    </div>
                  </dl>

                  <div className="ar-actions">
                    <button
                      type="button"
                      className="fx-btn fx-btn--primary"
                      onClick={() => handleAccept(request.id)}
                      disabled={isBusy}
                    >
                      <Check size={16} aria-hidden="true" />
                      {translate(isBusy ? 'artisanRequests.accepting' : 'artisanRequests.accept')}
                    </button>
                    <button
                      type="button"
                      className="fx-btn fx-btn--ghost"
                      onClick={() => setConfirmId(request.id)}
                      disabled={isBusy}
                    >
                      <X size={16} aria-hidden="true" />
                      {translate('artisanRequests.dismiss')}
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirmRequest)}
        title={translate('artisanWorkspace.dismissTitle')}
        message={translate('artisanWorkspace.dismissMessage').replace('{title}', confirmRequest?.title || confirmRequest?.categoryName || '')}
        confirmLabel={translate('artisanRequests.dismiss')}
        onConfirm={() => handleDismiss(confirmId)}
        onCancel={() => setConfirmId(null)}
        isBusy={actioningId === confirmId}
      />
    </section>
  )
}

export default ArtisanRequests
