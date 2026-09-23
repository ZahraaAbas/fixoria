import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import {
  getAvailableRequestsForArtisan,
  acceptRequest,
  dismissRequestForArtisan,
} from '../services/requestsService'
import './ArtisanRequests.css'

function ArtisanRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false

    getAvailableRequestsForArtisan(user)
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
  }, [user, attempt])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  async function handleAccept(requestId) {
    setActioningId(requestId)
    setActionError('')

    try {
      await acceptRequest(requestId, user)
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
    await dismissRequestForArtisan(requestId, user.id)
    setRequests((current) => current.filter((request) => request.id !== requestId))
    setActioningId(null)
  }

  return (
    <section>
      <h1>{translate('artisanRequests.title')}</h1>

      {isLoading && <p className="artisan-requests-status">{translate('artisanRequests.loading')}</p>}

      {!isLoading && error && (
        <div className="artisan-requests-status">
          <p>{translate('artisanRequests.error')}</p>
          <button type="button" className="artisan-requests-retry" onClick={handleRetry}>
            {translate('artisanRequests.retry')}
          </button>
        </div>
      )}

      {actionError && (
        <p className="artisan-requests-alert" role="alert">
          {translate(actionError)}
        </p>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <p className="artisan-requests-status">{translate('artisanRequests.empty')}</p>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <ul className="artisan-requests-list">
          {requests.map((request) => (
            <li key={request.id} className="artisan-request-card">
              <p className="artisan-request-title">{request.title}</p>
              <p className="artisan-request-meta">{request.categoryName}</p>
              <p className="artisan-request-meta">
                {translate('artisanRequests.building')}: {request.building} ·{' '}
                {translate('artisanRequests.apartment')}: {request.apartment}
              </p>
              {request.preferredDate && (
                <p className="artisan-request-meta">
                  {translate('artisanRequests.preferredDate')}: {request.preferredDate}
                </p>
              )}
              <p className="artisan-request-description">{request.description}</p>

              <div className="artisan-request-actions">
                <button
                  type="button"
                  className="artisan-accept-button"
                  onClick={() => handleAccept(request.id)}
                  disabled={actioningId === request.id}
                >
                  {translate(
                    actioningId === request.id
                      ? 'artisanRequests.accepting'
                      : 'artisanRequests.accept',
                  )}
                </button>
                <button
                  type="button"
                  className="artisan-dismiss-button"
                  onClick={() => handleDismiss(request.id)}
                  disabled={actioningId === request.id}
                >
                  {translate('artisanRequests.dismiss')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ArtisanRequests