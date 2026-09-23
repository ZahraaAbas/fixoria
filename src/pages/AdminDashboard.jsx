import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getDashboardStats } from '../services/adminService'
import './AdminDashboard.css'

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getDashboardStats()
      .then((data) => {
        if (!isCancelled) setStats(data)
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

  const cards = stats
    ? [
        { label: translate('adminDashboard.residents'), value: stats.residentsCount },
        { label: translate('adminDashboard.artisans'), value: stats.artisansCount },
        {
          label: translate('adminDashboard.approvedArtisans'),
          value: stats.approvedArtisansCount,
        },
        {
          label: translate('adminDashboard.pendingArtisans'),
          value: stats.pendingArtisansCount,
          highlight: stats.pendingArtisansCount > 0,
        },
        { label: translate('adminDashboard.totalRequests'), value: stats.totalRequestsCount },
        { label: translate('adminDashboard.activeRequests'), value: stats.activeRequestsCount },
        {
          label: translate('adminDashboard.completedRequests'),
          value: stats.completedRequestsCount,
        },
        { label: translate('adminDashboard.reviews'), value: stats.reviewsCount },
        { label: translate('adminDashboard.averageRating'), value: stats.averageRating || '—' },
      ]
    : []

  return (
    <section>
      <h1>{translate('adminDashboard.title')}</h1>

      {isLoading && <p className="admin-dashboard-status">{translate('adminDashboard.loading')}</p>}

      {!isLoading && error && (
        <div className="admin-dashboard-status">
          <p>{translate('adminDashboard.error')}</p>
          <button type="button" className="admin-dashboard-retry" onClick={handleRetry}>
            {translate('adminDashboard.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <div className="admin-dashboard-grid">
          {cards.map((card) => (
            <div
              key={card.label}
              className={card.highlight ? 'admin-stat-card admin-stat-card-highlight' : 'admin-stat-card'}
            >
              <p className="admin-stat-value">{card.value}</p>
              <p className="admin-stat-label">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default AdminDashboard