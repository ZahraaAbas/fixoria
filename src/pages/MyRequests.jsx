import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { translate } from '../i18n'
import { getMyResidentRequests } from '../services/requestsService'
import { statusKey } from '../utils/requestStatus'
import { formatDate } from '../utils/formatDate'
import { LoadingState, ErrorState } from '../components/StatusState'
import './MyRequests.css'

function MyRequests() {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getMyResidentRequests()
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

  return (
    <section>
      <h1>{translate('myRequests.title')}</h1>

      {isLoading && <LoadingState message={translate('myRequests.loading')} />}

      {!isLoading && error && (
        <ErrorState
          message={translate('myRequests.error')}
          onRetry={handleRetry}
          retryLabel={translate('myRequests.retry')}
        />
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
              <Link to={`/my-requests/${request.id}`} className="request-card-link">
                <div className="request-card-header">
                  <p className="request-card-title">{request.title || request.categoryName}</p>
                  <span className={`request-badge status-${statusKey(request.status)}`}>
                    {translate(`requestStatus.${statusKey(request.status)}`)}
                  </span>
                </div>
                <p className="request-card-category">
                  {translate('myRequests.category')}: {request.categoryName}
                </p>
                {request.preferredDate && (
                  <p className="request-card-date">
                    {translate('myRequests.preferredDate')}: {formatDate(request.preferredDate)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default MyRequests