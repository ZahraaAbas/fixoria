import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Ban, Building2, CalendarDays, Check, DoorOpen, FileQuestion, LayoutGrid, Star, XCircle } from 'lucide-react'
import { translate } from '../i18n'
import { getResidentRequestById, cancelResidentRequest } from '../services/requestsService'
import { statusKey, CANCELLABLE_STATUSES } from '../utils/requestStatus'
import { formatDate } from '../utils/formatDate'
import PeekRating from '../components/PeekRating'
import ReviewForm from './ReviewForm'
import { ErrorState, EmptyState } from '../components/StatusState'
import PageHeader, { BackLink } from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import MediaGallery from '../components/ui/MediaGallery'
import ActionError from '../components/ui/ActionError'
import { Reveal } from '../components/ui/Reveal'
import { easeOut, spring } from '../components/ui/motion'
import './RequestDetail.css'

function DetailSkeleton() {
  return (
    <div className="rd-skeleton" aria-hidden="true">
      <span className="fx-skeleton" style={{ width: '45%', height: 34 }} />
      <div className="rd-skeleton-grid">
        <span className="fx-skeleton" style={{ height: 220, borderRadius: 20 }} />
        <span className="fx-skeleton" style={{ height: 220, borderRadius: 20 }} />
      </div>
    </div>
  )
}

function Timeline({ steps }) {
  const reduceMotion = useReducedMotion()
  const reached = steps.filter((step) => step.done || step.active).length
  const fill = steps.length > 1 ? Math.max(0, reached - 1) / (steps.length - 1) : 0

  return (
    <section className="rd-card fx-card">
      <h2 className="rd-card-title">{translate('requestDetail.timeline')}</h2>
      <ol className="rd-timeline">
        <span className="rd-timeline-track" aria-hidden="true">
          <motion.span
            className="rd-timeline-fill"
            initial={reduceMotion ? false : { scaleY: 0 }}
            animate={{ scaleY: fill }}
            transition={{ duration: 1, ease: easeOut, delay: 0.3 }}
          />
        </span>
        {steps.map((step, index) => {
          // آخر خطوة عندما تكون الحالية تعني أن الطلب اكتمل، فتُعرض كمنجزة لا كجارية
          const isFinished = step.active && index === steps.length - 1
          const state = isFinished || (step.done && !step.active) ? 'done' : step.active ? 'active' : 'todo'
          return (
            <motion.li
              key={step.key}
              className={`rd-step rd-step--${state}`}
              initial={reduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: 0.2 + index * 0.1 }}
              aria-current={step.active ? 'step' : undefined}
            >
              <span className="rd-step-dot" aria-hidden="true">
                {state === 'done' ? <Check size={14} strokeWidth={3} /> : index + 1}
              </span>
              <span className="rd-step-label">{step.label}</span>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}

function RequestDetail() {
  const { id } = useParams()
  const reduceMotion = useReducedMotion()

  const [request, setRequest] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState('')

  const requestKey = `${id}-${attempt}`
  const [loadedFor, setLoadedFor] = useState(requestKey)
  if (loadedFor !== requestKey) {
    setLoadedFor(requestKey)
    setIsLoading(true)
    setError(null)
  }

  useEffect(() => {
    let isCancelled = false

    getResidentRequestById(id)
      .then((data) => {
        if (!isCancelled) setRequest(data)
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
  }, [id, attempt])

  function handleRetry() {
    setAttempt((count) => count + 1)
  }

  async function handleCancel() {
    setIsCancelling(true)
    setActionError('')
    try {
      const updated = await cancelResidentRequest(id)
      setRequest(updated)
      setIsConfirmingCancel(false)
    } catch {
      setActionError('common.actionError')
    } finally {
      setIsCancelling(false)
    }
  }

  const back = <BackLink to="/my-requests">{translate('requestDetail.backToList')}</BackLink>

  if (isLoading) {
    return (
      <article className="rd">
        {back}
        <p className="sr-only" role="status">
          {translate('requestDetail.loading')}
        </p>
        <DetailSkeleton />
      </article>
    )
  }

  if (error?.message === 'NOT_FOUND') {
    return (
      <EmptyState
        icon={FileQuestion}
        title={translate('requestDetail.notFound')}
        action={
          <Link to="/my-requests" className="fx-btn fx-btn--secondary">
            {translate('requestDetail.backToList')}
          </Link>
        }
      />
    )
  }

  if (error) {
    return (
      <ErrorState
        message={translate('requestDetail.error')}
        onRetry={handleRetry}
        retryLabel={translate('requestDetail.retry')}
      />
    )
  }

  const currentStatus = statusKey(request.status)
  const isCancellable = CANCELLABLE_STATUSES.includes(currentStatus)

  const info = [
    { key: 'category', Icon: LayoutGrid, value: request.categoryName },
    { key: 'building', Icon: Building2, value: request.building },
    { key: 'apartment', Icon: DoorOpen, value: request.apartment },
    ...(request.preferredDate
      ? [{ key: 'preferredDate', Icon: CalendarDays, value: formatDate(request.preferredDate) }]
      : []),
  ]

  return (
    <article className="rd">
      <PageHeader
        back={back}
        title={request.title || request.categoryName}
        meta={<StatusBadge status={request.status} className="rd-status" />}
      />

      <div className="rd-layout">
        <div className="rd-main">
          {currentStatus === 'cancelled' && (
            <p className="fx-notice fx-notice--muted">
              <Ban size={18} aria-hidden="true" />
              {translate('requestDetail.cancelledNotice')}
            </p>
          )}

          {currentStatus === 'rejected' && (
            <p className="fx-notice fx-notice--danger">
              <XCircle size={18} aria-hidden="true" />
              <span>
                {translate('requestDetail.rejectedNotice')}
                {request.rejectionReason &&
                  ` — ${translate('requestDetail.rejectionReason')}: ${request.rejectionReason}`}
              </span>
            </p>
          )}

          {currentStatus !== 'cancelled' && currentStatus !== 'rejected' && request.progress?.length > 0 && (
            <Timeline steps={request.progress} />
          )}

          <Reveal as="section" className="rd-card fx-card">
            <h2 className="rd-card-title">{translate('requestDetail.description')}</h2>
            <p className="rd-description">{request.description}</p>
            {request.images.length > 0 && (
              <MediaGallery images={request.images} label={translate('requestDetail.photos')} />
            )}
          </Reveal>

          {currentStatus === 'completed' && request.myRating != null && (
            <Reveal as="section" className="rd-card rd-card--reviewed fx-card fx-card--featured">
              <h2 className="rd-card-title">
                <Star size={18} aria-hidden="true" />
                {translate('requestDetail.myRating')}
              </h2>
              <PeekRating value={request.myRating} readOnly size={24} activeColor="#f19035" idleColor="#dac7c0" />
              {request.myReviewComment && <p className="rd-review-comment">{request.myReviewComment}</p>}
            </Reveal>
          )}

          {currentStatus === 'completed' && request.myRating == null && request.canReview && (
            <ReviewForm
              requestId={request.id}
              onSubmitted={(review) =>
                setRequest((current) => ({
                  ...current,
                  myRating: review.rating,
                  myReviewComment: review.comment,
                }))
              }
            />
          )}
        </div>

        <Reveal as="aside" className="rd-aside" delay={0.1}>
          <dl className="rd-info fx-card">
            {info.map(({ key, Icon, value }) => (
              <div key={key} className="rd-info-row">
                <span className="rd-info-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <dt>{translate(`requestDetail.${key}`)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {isCancellable && (
            <div className="rd-cancel">
              <ActionError messageKey={actionError} className="rd-cancel-error" />
              <AnimatePresence mode="wait" initial={false}>
                {isConfirmingCancel ? (
                  <motion.div
                    key="confirm"
                    className="rd-cancel-confirm"
                    role="alertdialog"
                    aria-label={translate('requestDetail.confirmCancel')}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                  >
                    <p>
                      <AlertTriangle size={18} aria-hidden="true" />
                      {translate('requestDetail.confirmCancel')}
                    </p>
                    <div className="rd-cancel-actions">
                      <button
                        type="button"
                        className="fx-btn fx-btn--sm rd-cancel-yes"
                        onClick={handleCancel}
                        disabled={isCancelling}
                      >
                        {translate(isCancelling ? 'requestDetail.cancelling' : 'requestDetail.confirmYes')}
                      </button>
                      <button
                        type="button"
                        className="fx-btn fx-btn--secondary fx-btn--sm"
                        onClick={() => setIsConfirmingCancel(false)}
                        disabled={isCancelling}
                      >
                        {translate('requestDetail.confirmNo')}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="cancel"
                    type="button"
                    className="fx-btn fx-btn--danger fx-btn--block"
                    onClick={() => setIsConfirmingCancel(true)}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                  >
                    <Ban size={16} aria-hidden="true" />
                    {translate('requestDetail.cancel')}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </Reveal>
      </div>
    </article>
  )
}

export default RequestDetail
