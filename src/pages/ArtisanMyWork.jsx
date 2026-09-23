import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getRequestsForArtisan, startRequest, completeRequest } from '../services/requestsService'
import { statusKey } from '../utils/requestStatus'
import './ArtisanMyWork.css'

const STATUS_ORDER = { accepted: 0, in_progress: 1, completed: 2, cancelled: 3 }

function ArtisanMyWork() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    let isCancelled = false

    getRequestsForArtisan(user.id)
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

  async function handleStart(id) {
    setActioningId(id)
    const updated = await startRequest(id)
    setRequests((current) => current.map((request) => (request.id === id ? updated : request)))
    setActioningId(null)
  }

  async function handleComplete(id) {
    setActioningId(id)
    const updated = await completeRequest(id)
    setRequests((current) => current.map((request) => (request.id === id ? updated : request)))
    setActioningId(null)
  }

  const sorted = [...requests].sort(
    (a, b) => STATUS_ORDER[statusKey(a.status)] - STATUS_ORDER[statusKey(b.status)],
  )

  return (
    <section>
      <h1>{translate('artisanMyWork.title')}</h1>

      {isLoading && <p className="my-work-status">{translate('artisanMyWork.loading')}</p>}

      {!isLoading && error && (
        <div className="my-work-status">
          <p>{translate('artisanMyWork.error')}</p>
          <button type="button" className="my-work-retry" onClick={handleRetry}>
            {translate('artisanMyWork.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && sorted.length === 0 && (
        <p className="my-work-status">{translate('artisanMyWork.empty')}</p>
      )}

      {!isLoading && !error && sorted.length > 0 && (
        <ul className="my-work-list">
          {sorted.map((request) => {
            const status = statusKey(request.status)
            return (
              <li key={request.id} className="my-work-card">
                <div className="my-work-header">
                  <p className="my-work-title">{request.title}</p>
                  <span className={`my-work-badge status-${status}`}>
                    {translate(`requestStatus.${status}`)}
                  </span>
                </div>
                <p className="my-work-meta">{request.categoryName}</p>
                <p className="my-work-meta">
                  {translate('artisanMyWork.building')}: {request.building} ·{' '}
                  {translate('artisanMyWork.apartment')}: {request.apartment}
                </p>
                <p className="my-work-description">{request.description}</p>

                {status === 'accepted' && (
                  <button
                    type="button"
                    className="my-work-action"
                    onClick={() => handleStart(request.id)}
                    disabled={actioningId === request.id}
                  >
                    {translate('artisanMyWork.start')}
                  </button>
                )}

                {status === 'in_progress' && (
                  <button
                    type="button"
                    className="my-work-action"
                    onClick={() => handleComplete(request.id)}
                    disabled={actioningId === request.id}
                  >
                    {translate('artisanMyWork.complete')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default ArtisanMyWork