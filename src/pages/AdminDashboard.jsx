import { useEffect, useState } from 'react'
import { Wrench, Users, TrendingUp, ClipboardList, Star } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getDashboardStats } from '../services/adminService'
import PeekRating from '../components/PeekRating'
import './AdminDashboard.css'

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function ratingLabel(rating) {
  if (!rating) return translate('adminDashboard.ratingNone')
  if (rating >= 4.5) return translate('adminDashboard.ratingExcellent')
  if (rating >= 3.5) return translate('adminDashboard.ratingGood')
  if (rating >= 2.5) return translate('adminDashboard.ratingFair')
  return translate('adminDashboard.ratingPoor')
}

function CompletionGauge({ percent }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <svg width={180} height={180} viewBox="0 0 180 180" className="completion-gauge">
      <circle cx="90" cy="90" r={radius} className="completion-gauge-track" />
      <circle
        cx="90"
        cy="90"
        r={radius}
        className="completion-gauge-value"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="90" y="84" textAnchor="middle" className="completion-gauge-percent">
        {percent}%
      </text>
      <text x="90" y="108" textAnchor="middle" className="completion-gauge-caption">
        {translate('adminDashboard.completionLegendDone')}
      </text>
    </svg>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
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

  const today = new Date().toLocaleDateString('ar-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const usersTotal = stats ? stats.residentsCount + stats.artisansCount : 0
  const otherRequests = stats
    ? Math.max(stats.totalRequestsCount - stats.activeRequestsCount - stats.completedRequestsCount, 0)
    : 0
  const completionPercent = stats ? pct(stats.completedRequestsCount, stats.totalRequestsCount) : 0

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-hero">
        <p className="admin-dashboard-greeting">
          {translate('adminDashboard.greeting')}، {user.fullName}
        </p>
        <h1>{translate('adminDashboard.title')}</h1>
        <p className="admin-dashboard-subtitle">
          {translate('adminDashboard.subtitle')} · {today}
        </p>
      </div>

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
        <>
          <div className="admin-dashboard-row admin-dashboard-row-top">
            <div className="dash-card">
              <div className="dash-card-head">
                <span className="dash-card-icon">
                  <Wrench size={18} />
                </span>
                <span className="dash-card-title">{translate('adminDashboard.artisansCardTitle')}</span>
              </div>

              <div className="dash-bar-row">
                <div className="dash-bar-labels">
                  <span>{translate('adminDashboard.approvedArtisans')}</span>
                  <span>{stats.approvedArtisansCount}</span>
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill dash-bar-fill-accent"
                    style={{ width: `${pct(stats.approvedArtisansCount, stats.artisansCount)}%` }}
                  />
                </div>
              </div>

              <div className="dash-bar-row">
                <div className="dash-bar-labels">
                  <span>{translate('adminDashboard.pendingArtisans')}</span>
                  <span>{stats.pendingArtisansCount}</span>
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill dash-bar-fill-muted"
                    style={{ width: `${pct(stats.pendingArtisansCount, stats.artisansCount)}%` }}
                  />
                </div>
              </div>

              <p className="dash-card-total">
                {stats.artisansCount}
                <span>{translate('adminDashboard.artisansTotal')}</span>
              </p>
            </div>

            <div className="dash-card">
              <div className="dash-card-head">
                <span className="dash-card-icon">
                  <Users size={18} />
                </span>
                <span className="dash-card-title">{translate('adminDashboard.usersCardTitle')}</span>
              </div>

              <div className="dash-segmented-bar">
                <span
                  className="dash-segment dash-segment-1"
                  style={{ width: `${pct(stats.residentsCount, usersTotal)}%` }}
                />
                <span
                  className="dash-segment dash-segment-2"
                  style={{ width: `${pct(stats.approvedArtisansCount, usersTotal)}%` }}
                />
                <span
                  className="dash-segment dash-segment-3"
                  style={{ width: `${pct(stats.pendingArtisansCount, usersTotal)}%` }}
                />
              </div>

              <div className="dash-legend">
                <span className="dash-legend-item">
                  <i className="dash-dot dash-dot-1" />
                  {translate('adminDashboard.residents')} {pct(stats.residentsCount, usersTotal)}%
                </span>
                <span className="dash-legend-item">
                  <i className="dash-dot dash-dot-2" />
                  {translate('adminDashboard.approvedArtisans')} {pct(stats.approvedArtisansCount, usersTotal)}%
                </span>
                <span className="dash-legend-item">
                  <i className="dash-dot dash-dot-3" />
                  {translate('adminDashboard.pendingArtisans')} {pct(stats.pendingArtisansCount, usersTotal)}%
                </span>
              </div>

              <p className="dash-card-total">
                {usersTotal}
                <span>{translate('adminDashboard.usersTotal')}</span>
              </p>
            </div>

            <div className="dash-card dash-card-wide">
              <div className="dash-card-head">
                <span className="dash-card-icon">
                  <TrendingUp size={18} />
                </span>
                <span className="dash-card-title">{translate('adminDashboard.completionCardTitle')}</span>
              </div>

              <div className="dash-gauge-wrapper">
                <CompletionGauge percent={completionPercent} />
              </div>

              <div className="dash-legend dash-legend-centered">
                <span className="dash-legend-item">
                  <i className="dash-dot dash-dot-1" />
                  {translate('adminDashboard.completionLegendDone')}
                </span>
                <span className="dash-legend-item">
                  <i className="dash-dot dash-dot-muted" />
                  {translate('adminDashboard.completionLegendRest')}
                </span>
              </div>

              <p className="dash-card-caption">{translate('adminDashboard.completionSubtitle')}</p>
            </div>
          </div>

          <div className="admin-dashboard-row admin-dashboard-row-bottom">
            <div className="dash-card">
              <div className="dash-card-head">
                <span className="dash-card-icon">
                  <ClipboardList size={18} />
                </span>
                <span className="dash-card-title">{translate('adminDashboard.requestsCardTitle')}</span>
              </div>

              <div className="dash-bar-row">
                <div className="dash-bar-labels">
                  <span>{translate('adminDashboard.activeRequests')}</span>
                  <span>{stats.activeRequestsCount}</span>
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill dash-bar-fill-accent"
                    style={{ width: `${pct(stats.activeRequestsCount, stats.totalRequestsCount)}%` }}
                  />
                </div>
              </div>

              <div className="dash-bar-row">
                <div className="dash-bar-labels">
                  <span>{translate('adminDashboard.completedRequests')}</span>
                  <span>{stats.completedRequestsCount}</span>
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill dash-bar-fill-light"
                    style={{ width: `${pct(stats.completedRequestsCount, stats.totalRequestsCount)}%` }}
                  />
                </div>
              </div>

              <div className="dash-bar-row">
                <div className="dash-bar-labels">
                  <span>{translate('adminDashboard.otherRequests')}</span>
                  <span>{otherRequests}</span>
                </div>
                <div className="dash-bar-track">
                  <div
                    className="dash-bar-fill dash-bar-fill-muted"
                    style={{ width: `${pct(otherRequests, stats.totalRequestsCount)}%` }}
                  />
                </div>
              </div>

              <p className="dash-card-total">
                {stats.totalRequestsCount}
                <span>{translate('adminDashboard.totalRequests')}</span>
              </p>
            </div>

            <div className="dash-card">
              <div className="dash-card-head">
                <span className="dash-card-icon">
                  <Star size={18} />
                </span>
                <span className="dash-card-title">{translate('adminDashboard.ratingCardTitle')}</span>
              </div>

              <p className="dash-rating-value">
                {stats.averageRating || '—'}
                <span className="dash-rating-word">{ratingLabel(stats.averageRating)}</span>
              </p>

              <PeekRating
                value={Math.round(stats.averageRating)}
                readOnly
                size={22}
                activeColor="#f19035"
                idleColor="rgba(255,255,255,0.2)"
              />

              <p className="dash-card-caption">
                {stats.reviewsCount} {translate('adminDashboard.ratingCount')}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export default AdminDashboard
