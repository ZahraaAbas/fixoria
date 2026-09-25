import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ClipboardList, Loader2, CheckCircle2, Star } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getRequestsForArtisan, getReviewsForArtisan } from '../services/requestsService'
import { statusKey } from '../utils/requestStatus'
import './ArtisanDashboard.css'

const TIMELINE_STEPS = ['open', 'accepted', 'in_progress', 'completed']

function average(numbers) {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((total, value) => total + value, 0)
  return Math.round((sum / numbers.length) * 10) / 10
}

function getMonthlyActivity(requests) {
  const now = new Date()
  const buckets = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('ar', { month: 'short' }),
      count: 0,
    })
  }
  requests.forEach((request) => {
    const d = new Date(request.createdAt)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.count += 1
  })
  return buckets
}

function ArtisanDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    Promise.all([getRequestsForArtisan(user.id), getReviewsForArtisan(user.id)])
      .then(([requestsData, reviewsData]) => {
        if (!isCancelled) {
          setRequests(requestsData)
          setReviews(reviewsData)
        }
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

  if (isLoading) {
    return <p className="artisan-dashboard-status">{translate('artisanDashboard.loading')}</p>
  }

  if (error) {
    return (
      <div className="artisan-dashboard-status">
        <p>{translate('artisanDashboard.error')}</p>
        <button type="button" className="artisan-dashboard-retry" onClick={handleRetry}>
          {translate('artisanDashboard.retry')}
        </button>
      </div>
    )
  }

  const activeCount = requests.filter((r) =>
    ['accepted', 'in_progress'].includes(statusKey(r.status)),
  ).length
  const completedCount = requests.filter((r) => statusKey(r.status) === 'completed').length
  const averageRating = average(reviews.map((r) => r.rating))

  const current =
    requests.find((r) => statusKey(r.status) === 'in_progress') ??
    requests.find((r) => statusKey(r.status) === 'accepted')
  const currentStepIndex = current ? TIMELINE_STEPS.indexOf(statusKey(current.status)) : -1

  const chartData = getMonthlyActivity(requests)

  return (
    <section className="artisan-dashboard">
      <div className="ad-hero">
        <p className="ad-hero-greeting">
          {translate('artisanDashboard.greeting')}، {user.fullName}
        </p>
        <h1>{translate('artisanDashboard.title')}</h1>
        <p className="ad-hero-subtitle">{translate('artisanDashboard.heroSubtitle')}</p>
      </div>

      <div className="ad-stats">
        <div className="ad-card">
          <span className="ad-card-icon">
            <ClipboardList size={18} />
          </span>
          <p className="ad-card-value">{requests.length}</p>
          <p className="ad-card-label">{translate('artisanDashboard.total')}</p>
        </div>
        <div className="ad-card">
          <span className="ad-card-icon">
            <Loader2 size={18} />
          </span>
          <p className="ad-card-value">{activeCount}</p>
          <p className="ad-card-label">{translate('artisanDashboard.active')}</p>
        </div>
        <div className="ad-card">
          <span className="ad-card-icon">
            <CheckCircle2 size={18} />
          </span>
          <p className="ad-card-value">{completedCount}</p>
          <p className="ad-card-label">{translate('artisanDashboard.completed')}</p>
        </div>
        <div className="ad-card">
          <span className="ad-card-icon">
            <Star size={18} />
          </span>
          <p className="ad-card-value">{averageRating || '—'}</p>
          <p className="ad-card-label">{translate('artisanDashboard.rating')}</p>
        </div>
      </div>

      <div className="ad-section">
        <h2>{translate('artisanDashboard.currentTitle')}</h2>
        {current ? (
          <div className="ad-current-card">
            <p className="ad-current-title">{current.title}</p>
            <p className="ad-current-meta">{current.categoryName}</p>

            <ol className="ad-timeline">
              {TIMELINE_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={index <= currentStepIndex ? 'ad-timeline-step is-active' : 'ad-timeline-step'}
                >
                  <span className="ad-timeline-dot" />
                  <span className="ad-timeline-label">{translate(`requestStatus.${step}`)}</span>
                </li>
              ))}
            </ol>

            <Link to="/artisan/my-work" className="ad-current-link">
              {translate('artisanDashboard.viewInMyWork')}
            </Link>
          </div>
        ) : (
          <p className="artisan-dashboard-status">{translate('artisanDashboard.noCurrent')}</p>
        )}
      </div>

      <div className="ad-section">
        <h2>{translate('artisanDashboard.activityTitle')}</h2>
        <div className="ad-chart-card">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.55)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.55)" fontSize={12} />
              <Tooltip contentStyle={{ background: '#263056', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="count" fill="#f19035" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

export default ArtisanDashboard