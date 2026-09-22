import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getRequestsByResident } from '../services/requestsService'
import './MyRequests.css'

function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '_')
}

function MyRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getRequestsByResident(user.id)
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

      {isLoading && <p className="my-requests-status">{translate('myRequests.loading')}</p>}

      {!isLoading && error && (
        <div className="my-requests-status">
          <p>{translate('myRequests.error')}</p>
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
                <p className="request-card-title">{request.title}</p>
                <span className={`request-badge status-${statusKey(request.status)}`}>
                  {translate(`requestStatus.${statusKey(request.status)}`)}
                </span>
              </div>
              <p className="request-card-category">
                {translate('myRequests.category')}: {request.categoryName}
              </p>
              {request.preferredDate && (
                <p className="request-card-date">
                  {translate('myRequests.preferredDate')}: {request.preferredDate}
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