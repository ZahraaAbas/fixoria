import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getRequestsOverview } from '../services/adminService'
import { statusKey } from '../utils/requestStatus'
import { LoadingState, ErrorState } from '../components/StatusState'
import './AdminRequests.css'

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled']

function AdminRequests() {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let isCancelled = false

    getRequestsOverview()
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

  const filtered = requests.filter((request) => {
    const status = statusKey(request.status)
    if (statusFilter !== 'all' && status !== statusFilter) return false

    const term = searchTerm.trim().toLowerCase()
    if (!term) return true

    return (
      (request.title || '').toLowerCase().includes(term) ||
      (request.categoryName || '').toLowerCase().includes(term) ||
      (request.residentName || '').toLowerCase().includes(term) ||
      (request.artisanName || '').toLowerCase().includes(term)
    )
  })

  return (
    <section>
      <h1>{translate('adminRequests.title')}</h1>

      <div className="admin-requests-toolbar">
        <input
          type="search"
          className="admin-requests-search"
          placeholder={translate('adminRequests.searchPlaceholder')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <div className="admin-requests-filters">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={
                statusFilter === status
                  ? 'admin-filter-button admin-filter-button-active'
                  : 'admin-filter-button'
              }
              onClick={() => setStatusFilter(status)}
            >
              {translate(`adminRequests.filters.${status}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <LoadingState message={translate('adminRequests.loading')} />}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminRequests.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminRequests.retry')}
        />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="admin-requests-status">{translate('adminRequests.empty')}</p>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <ul className="admin-requests-list">
          {filtered.map((request) => {
            const status = statusKey(request.status)
            return (
              <li key={request.id} className="admin-request-card">
                <div className="admin-request-header">
                  <p className="admin-request-title">{request.title || request.categoryName}</p>
                  <span className={`admin-request-badge status-${status}`}>
                    {translate(`requestStatus.${status}`)}
                  </span>
                </div>
                <p className="admin-request-meta">{request.categoryName}</p>
                <p className="admin-request-meta">
                  {translate('adminRequests.resident')}: {request.residentName}
                </p>
                {request.artisanName && (
                  <p className="admin-request-meta">
                    {translate('adminRequests.artisan')}: {request.artisanName}
                  </p>
                )}
                <p className="admin-request-meta">
                  {translate('adminRequests.building')}: {request.building} ·{' '}
                  {translate('adminRequests.apartment')}: {request.apartment}
                </p>
                <p className="admin-request-description">{request.description}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default AdminRequests