import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowLeft, Briefcase, CheckCircle2, ClipboardList, Coffee, Inbox, Loader2, Star } from 'lucide-react'
import { translate, getCurrentLanguage } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getRequestsForArtisan, getReviewsForArtisan } from '../services/requestsService'
import { statusKey } from '../utils/requestStatus'
import { ErrorState, EmptyState } from '../components/StatusState'
import StatusBadge from '../components/ui/StatusBadge'
import CountUp from '../components/ui/CountUp'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import './ArtisanDashboard.css'

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
      month: d.toLocaleDateString(getCurrentLanguage(), { month: 'short' }),
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

function DashboardSkeleton() {
  return (
    <div className="ad-skeleton" aria-hidden="true">
      <span className="fx-skeleton ad-skeleton-hero" />
      <div className="ad-skeleton-row">
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className="fx-skeleton ad-skeleton-tile" />
        ))}
      </div>
      <div className="ad-skeleton-row ad-skeleton-row--2">
        <span className="fx-skeleton ad-skeleton-panel" />
        <span className="fx-skeleton ad-skeleton-panel" />
      </div>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="ad-chart-tip">
      <span>{label}</span>
      <strong>{payload[0].value}</strong>
    </div>
  )
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

    Promise.all([getRequestsForArtisan(), getReviewsForArtisan(user.id)])
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
    return (
      <>
        <p className="sr-only" role="status">
          {translate('artisanDashboard.loading')}
        </p>
        <DashboardSkeleton />
      </>
    )
  }

  if (error) {
    return (
      <ErrorState
        message={translate('artisanDashboard.error')}
        onRetry={handleRetry}
        retryLabel={translate('artisanDashboard.retry')}
      />
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

  const chartData = getMonthlyActivity(requests)
  // في العربية يسير الزمن من اليمين لليسار
  const isRtl = document.documentElement.dir === 'rtl'

  const stats = [
    { key: 'total', value: requests.length, Icon: ClipboardList, tone: 'navy' },
    { key: 'active', value: activeCount, Icon: Loader2, tone: 'orange' },
    { key: 'completed', value: completedCount, Icon: CheckCircle2, tone: 'green' },
  ]

  return (
    <section className="ad">
      <Reveal className="ad-hero fx-surface-depth">
        <span className="ad-hero-pattern" aria-hidden="true" />
        <div className="ad-hero-text">
          <p className="ad-hero-greeting">
            {translate('artisanDashboard.greeting')}
            {translate('common.comma')}
            {user.fullName}
          </p>
          <h1 className="ad-hero-title">{translate('artisanDashboard.title')}</h1>
          <p className="ad-hero-subtitle">{translate('artisanDashboard.heroSubtitle')}</p>
        </div>
        <div className="ad-hero-actions">
          <Link to="/artisan/requests" className="fx-btn fx-btn--primary">
            <Inbox size={17} aria-hidden="true" />
            {translate('artisanNav.requests')}
          </Link>
          <Link to="/artisan/my-work" className="fx-btn ad-hero-ghost">
            <Briefcase size={17} aria-hidden="true" />
            {translate('artisanNav.myWork')}
          </Link>
        </div>
      </Reveal>

      <RevealGroup className="ad-stats" gap={0.07}>
        {stats.map(({ key, value, Icon, tone }) => (
          <RevealItem key={key} className={`ad-stat ad-stat--${tone} fx-card`}>
            <span className="ad-stat-icon" aria-hidden="true">
              <Icon size={20} />
            </span>
            <p className="ad-stat-value">
              <CountUp value={value} />
            </p>
            <p className="ad-stat-label">{translate(`artisanDashboard.${key}`)}</p>
          </RevealItem>
        ))}
        <RevealItem className="ad-stat ad-stat--rating">
          <span className="ad-stat-icon" aria-hidden="true">
            <Star size={20} />
          </span>
          <p className="ad-stat-value">
            {averageRating ? <CountUp value={averageRating} decimals={1} /> : '—'}
            {averageRating > 0 && <span className="ad-stat-of">/5</span>}
          </p>
          <p className="ad-stat-label">{translate('artisanDashboard.rating')}</p>
        </RevealItem>
      </RevealGroup>

      <div className="ad-panels">
        <Reveal as="section" className="ad-panel fx-card" aria-labelledby="ad-current-title">
          <h2 id="ad-current-title" className="ad-panel-title">
            {translate('artisanDashboard.currentTitle')}
          </h2>
          {current ? (
            <div className="ad-current">
              <div className="ad-current-head">
                <div>
                  <p className="ad-current-title">{current.title || current.categoryName}</p>
                  <p className="ad-current-meta">{current.categoryName}</p>
                </div>
                <StatusBadge status={current.status} />
              </div>

              <ol className="ad-steps">
                {current.progress?.map((step) => (
                  <li
                    key={step.key}
                    className={`ad-step ${step.done ? 'is-done' : ''} ${step.active ? 'is-active' : ''}`}
                  >
                    <span className="ad-step-bar" aria-hidden="true" />
                    <span className="ad-step-label">{step.label}</span>
                  </li>
                ))}
              </ol>

              <Link to="/artisan/my-work" className="ad-current-link">
                {/* النص الأصلي يحتوي سهمًا نصيًا؛ نستبدله بأيقونة تتبع اتجاه اللغة */}
                {translate('artisanDashboard.viewInMyWork').replace(/[←→]/g, '').trim()}
                <ArrowLeft size={16} aria-hidden="true" className="icon-forward" />
              </Link>
            </div>
          ) : (
            <EmptyState icon={Coffee} title={translate('artisanDashboard.noCurrent')} />
          )}
        </Reveal>

        <Reveal as="section" className="ad-panel fx-card" delay={0.1} aria-labelledby="ad-chart-title">
          <h2 id="ad-chart-title" className="ad-panel-title">
            {translate('artisanDashboard.activityTitle')}
          </h2>
          <div className="ad-chart">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={isRtl ? { top: 8, right: -24, left: 4, bottom: 0 } : { top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="adBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f19035" />
                    <stop offset="100%" stopColor="#fdb78e" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#eadcd6" />
                <XAxis reversed={isRtl} dataKey="month" stroke="#8f6c60" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis orientation={isRtl ? 'right' : 'left'} allowDecimals={false} stroke="#8f6c60" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(218, 199, 192, 0.25)', radius: 8 }} />
                <Bar dataKey="count" fill="url(#adBar)" radius={[8, 8, 4, 4]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default ArtisanDashboard
