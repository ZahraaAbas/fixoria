import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getRequestById, cancelRequest } from '../services/requestsService'
import { statusKey, CANCELLABLE_STATUSES } from '../utils/requestStatus'
import ReviewForm from './ReviewForm'
import './RequestDetail.css'

const TIMELINE_STEPS = ['open', 'accepted', 'in_progress', 'completed']

function RequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()

  const [request, setRequest] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const requestKey = `${id}-${attempt}`
  const [loadedFor, setLoadedFor] = useState(requestKey)
  if (loadedFor !== requestKey) {
    setLoadedFor(requestKey)
    setIsLoading(true)
    setError(null)
  }

  useEffect(() => {
    let isCancelled = false

    getRequestById(id)
      .then((data) => {
        if (isCancelled) return
        if (data.residentId !== user.id) {
          setError(new Error('NOT_FOUND'))
          return
        }
        setRequest(data)
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
  }, [id, user.id, attempt])

  function handleRetry() {
    setAttempt((count) => count + 1)
  }

  async function handleCancel() {
    setIsCancelling(true)
    const updated = await cancelRequest(id)
    setRequest(updated)
    setIsCancelling(false)
    setIsConfirmingCancel(false)
  }

  if (isLoading) {
    return <p className="request-detail-status">{translate('requestDetail.loading')}</p>
  }

  if (error?.message === 'NOT_FOUND') {
    return (
      <div className="request-detail-status">
        <p>{translate('requestDetail.notFound')}</p>
        <Link to="/my-requests">{translate('requestDetail.backToList')}</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="request-detail-status">
        <p>{translate('requestDetail.error')}</p>
        <button type="button" className="request-detail-retry" onClick={handleRetry}>
          {translate('requestDetail.retry')}
        </button>
      </div>
    )
  }

  const currentStatus = statusKey(request.status)
  const isCancellable = CANCELLABLE_STATUSES.includes(currentStatus)
  const currentStepIndex = TIMELINE_STEPS.indexOf(currentStatus)

  return (
    <article className="request-detail">
      <Link to="/my-requests" className="request-detail-back">
        {translate('requestDetail.backToList')}
      </Link>

      <div className="request-detail-header">
        <h1>{request.title}</h1>
        <span className={`request-badge status-${currentStatus}`}>
          {translate(`requestStatus.${currentStatus}`)}
        </span>
      </div>

      <dl className="request-detail-info">
        <div>
          <dt>{translate('requestDetail.category')}</dt>
          <dd>{request.categoryName}</dd>
        </div>
        <div>
          <dt>{translate('requestDetail.building')}</dt>
          <dd>{request.building}</dd>
        </div>
        <div>
          <dt>{translate('requestDetail.apartment')}</dt>
          <dd>{request.apartment}</dd>
        </div>
        {request.preferredDate && (
          <div>
            <dt>{translate('requestDetail.preferredDate')}</dt>
            <dd>{request.preferredDate}</dd>
          </div>
        )}
      </dl>

      <p className="request-detail-description-label">{translate('requestDetail.description')}</p>
      <p className="request-detail-description">{request.description}</p>

      {currentStatus === 'cancelled' ? (
        <p className="request-detail-cancelled-notice">
          {translate('requestDetail.cancelledNotice')}
        </p>
      ) : (
        <div className="request-timeline">
          <p className="request-timeline-label">{translate('requestDetail.timeline')}</p>
          <ol>
            {TIMELINE_STEPS.map((step, index) => (
              <li
                key={step}
                className={index <= currentStepIndex ? 'timeline-step active' : 'timeline-step'}
              >
                {translate(`requestStatus.${step}`)}
              </li>
            ))}
          </ol>
        </div>
      )}

      {isCancellable && (
        <div className="request-cancel">
          {isConfirmingCancel ? (
            <div className="request-cancel-confirm">
              <p>{translate('requestDetail.confirmCancel')}</p>
              <button
                type="button"
                className="request-cancel-confirm-yes"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {translate(isCancelling ? 'requestDetail.cancelling' : 'requestDetail.confirmYes')}
              </button>
              <button
                type="button"
                className="request-cancel-confirm-no"
                onClick={() => setIsConfirmingCancel(false)}
                disabled={isCancelling}
              >
                {translate('requestDetail.confirmNo')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="request-cancel-button"
              onClick={() => setIsConfirmingCancel(true)}
            >
              {translate('requestDetail.cancel')}
            </button>
          )}
        </div>
      )}

      {currentStatus === 'completed' && !request.review && (
        <ReviewForm requestId={request.id} onSubmitted={setRequest} />
      )}

      {currentStatus === 'completed' && request.review && (
        <p className="request-detail-reviewed">{translate('review.thanks')}</p>
      )}
    </article>
  )
}

export default RequestDetail