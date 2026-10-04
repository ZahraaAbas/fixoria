import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Briefcase, Building2, CheckCheck, DoorOpen, Play } from 'lucide-react'
import { translate } from '../i18n'
import { getRequestsForArtisan, startRequest, completeRequest } from '../services/requestsService'
import { statusKey, statusTone } from '../utils/requestStatus'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import MediaGallery from '../components/ui/MediaGallery'
import AudioNote from '../components/ui/AudioNote'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import { spring } from '../components/ui/motion'
import ActionError from '../components/ui/ActionError'
import './ArtisanMyWork.css'

const STATUS_ORDER = { accepted: 0, in_progress: 1, completed: 2, cancelled: 3, rejected: 4 }

// تجميع القائمة المرتّبة إلى مجموعات متتالية حسب الحالة (للعرض فقط)
function groupByStatus(sortedRequests) {
  const groups = []
  sortedRequests.forEach((request) => {
    const status = statusKey(request.status)
    const last = groups[groups.length - 1]
    if (last && last.status === status) last.items.push(request)
    else groups.push({ status, items: [request] })
  })
  return groups
}

function ArtisanMyWork() {
  const reduceMotion = useReducedMotion()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false

    getRequestsForArtisan()
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

  // يغيّر حالة الطلب ويعرض رسالة إن فشل الطلب بدل أن يعلق الزر
  async function runStatusChange(id, action) {
    setActioningId(id)
    setActionError('')
    try {
      const updated = await action(id)
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)))
    } catch {
      setActionError('common.actionError')
    } finally {
      setActioningId(null)
    }
  }

  function handleStart(id) {
    return runStatusChange(id, startRequest)
  }

  function handleComplete(id) {
    return runStatusChange(id, completeRequest)
  }

  const sorted = [...requests].sort(
    (a, b) => STATUS_ORDER[statusKey(a.status)] - STATUS_ORDER[statusKey(b.status)],
  )
  const groups = groupByStatus(sorted)

  return (
    <section className="mw">
      <PageHeader title={translate('artisanMyWork.title')} />
      <ActionError messageKey={actionError} className="mw-error" />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('artisanMyWork.loading')}
          </p>
          <SkeletonList count={4} />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('artisanMyWork.error')}
          onRetry={handleRetry}
          retryLabel={translate('artisanMyWork.retry')}
        />
      )}

      {!isLoading && !error && sorted.length === 0 && (
        <EmptyState icon={Briefcase} title={translate('artisanMyWork.empty')} />
      )}

      {!isLoading && !error && sorted.length > 0 && (
        <div className="mw-groups">
          {groups.map((group) => (
            <section key={group.status} className="mw-group" aria-label={translate(`requestStatus.${group.status}`)}>
              <h2 className={`mw-group-title mw-group-title--${statusTone(group.status)}`}>
                <span className="mw-group-dot" aria-hidden="true" />
                {translate(`requestStatus.${group.status}`)}
                <span className="mw-group-count">{group.items.length}</span>
              </h2>

              <RevealGroup as="ul" className="mw-list" gap={0.05}>
                {group.items.map((request) => {
                  const status = statusKey(request.status)
                  const isBusy = actioningId === request.id
                  return (
                    <RevealItem as="li" key={request.id} className={`mw-card mw-card--${statusTone(status)} fx-card`}>
                      <motion.div layout={!reduceMotion} transition={spring} className="mw-card-inner">
                        <div className="mw-card-main">
                          <p className="mw-card-title">{request.title || request.categoryName}</p>
                          <p className="mw-card-meta">
                            <span className="fx-badge fx-badge--plain">{request.categoryName}</span>
                            <span className="mw-card-place">
                              <Building2 size={14} aria-hidden="true" />
                              {translate('artisanMyWork.building')}: <strong>{request.building}</strong>
                            </span>
                            <span className="mw-card-place">
                              <DoorOpen size={14} aria-hidden="true" />
                              {translate('artisanMyWork.apartment')}: <strong>{request.apartment}</strong>
                            </span>
                          </p>
                          <p className="mw-card-description">{request.description}</p>
                          {request.images.length > 0 && (
                            <MediaGallery images={request.images} label={translate('requestDetail.photos')} size="sm" />
                          )}
                          <AudioNote src={request.audio} />
                        </div>

                        {status === 'accepted' && (
                          <button
                            type="button"
                            className="fx-btn fx-btn--dark mw-card-action"
                            onClick={() => handleStart(request.id)}
                            disabled={isBusy}
                            data-loading={isBusy || undefined}
                          >
                            <Play size={16} aria-hidden="true" />
                            {translate('artisanMyWork.start')}
                          </button>
                        )}

                        {status === 'in_progress' && (
                          <button
                            type="button"
                            className="fx-btn fx-btn--primary mw-card-action"
                            onClick={() => handleComplete(request.id)}
                            disabled={isBusy}
                            data-loading={isBusy || undefined}
                          >
                            <CheckCheck size={16} aria-hidden="true" />
                            {translate('artisanMyWork.complete')}
                          </button>
                        )}
                      </motion.div>
                    </RevealItem>
                  )
                })}
              </RevealGroup>
            </section>
          ))}
        </div>
      )}
    </section>
  )
}

export default ArtisanMyWork
