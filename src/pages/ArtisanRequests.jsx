import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Building2, CalendarDays, Check, DoorOpen, Inbox, X } from 'lucide-react'
import { translate } from '../i18n'
import {
  getAvailableRequestsForArtisan,
  acceptRequest,
  dismissRequestForArtisan,
} from '../services/requestsService'
import { formatDate } from '../utils/formatDate'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { easeOut } from '../components/ui/motion'
import './ArtisanRequests.css'

function ArtisanRequests() {
  const reduceMotion = useReducedMotion()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')

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

    try {
      await acceptRequest(requestId)
      setRequests((current) => current.filter((request) => request.id !== requestId))
    } catch {
      setActionError('artisanRequests.alreadyTaken')
      setRequests((current) => current.filter((request) => request.id !== requestId))
    } finally {
      setActioningId(null)
    }
  }

  async function handleDismiss(requestId) {
    setActioningId(requestId)
    await dismissRequestForArtisan(requestId)
    setRequests((current) => current.filter((request) => request.id !== requestId))
    setActioningId(null)
  }

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

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState icon={Inbox} title={translate('artisanRequests.empty')} />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <ul className="ar-grid">
          <AnimatePresence initial={!reduceMotion} mode="popLayout">
            {requests.map((request, index) => {
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
                        {formatDate(request.preferredDate)}
                      </span>
                    )}
                  </div>

                  <p className="ar-title">{request.title || request.categoryName}</p>
                  <p className="ar-description">{request.description}</p>

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
                      onClick={() => handleDismiss(request.id)}
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
    </section>
  )
}

export default ArtisanRequests
