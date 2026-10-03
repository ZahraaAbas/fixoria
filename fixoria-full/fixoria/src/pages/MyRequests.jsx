import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getMyRequests } from '../services/requestsService'
import { parseApiDate } from '../services/api'
import './MyRequests.css'

function formatDateTime(value) {
  const date = parseApiDate(value)
  return date
    ? date.toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' })
    : null
}

function MyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getMyRequests()
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
  }, [user.id, attempt])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  return (
    <section>
      <h1>{translate('myRequests.title')}</h1>
      <p>
        <Link to="/dashboard">{translate('myRequests.openDashboard')}</Link>
      </p>

      {isLoading && <p className="my-requests-status">{translate('myRequests.loading')}</p>}

      {!isLoading && error && (
        <div className="my-requests-status">
          <p>{translate(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'myRequests.error')}</p>
          <button type="button" className="my-requests-retry" onClick={handleRetry}>
            {translate('myRequests.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <div className="my-requests-status">
          <p>{translate('myRequests.empty')}</p>
          <Link to="/home">{translate('myRequests.browseCategories')}</Link>
        </div>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <ul className="request-list">
          {requests.map((request) => (
            <li key={request.id} className="request-card">
              <div className="request-card-header">
                <p className="request-card-title">
                  #{request.id} — {request.title}
                </p>
                <span className={`request-badge status-${request.status}`}>
                  {request.statusLabel || translate(`requestStatus.${request.status}`)}
                </span>
              </div>
              <p className="request-card-category">
                {translate('myRequests.artisan')}: {request.artisanName || translate('myRequests.awaitingArtisan')}
              </p>
              {request.preferredDate && (
                <p className="request-card-date">
                  {translate('myRequests.preferredDate')}: {formatDateTime(request.preferredDate)}
                </p>
              )}
              {request.price != null && (
                <p className="request-card-date">
                  {translate('myRequests.price')}: {request.price.toLocaleString('en-US')} د.ع
                </p>
              )}
              {request.rejectionReason && (
                <p className="request-card-date">
                  {translate('myRequests.rejectionReason')}: {request.rejectionReason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default MyRequests
