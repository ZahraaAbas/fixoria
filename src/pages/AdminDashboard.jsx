import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Wrench, Users, TrendingUp, ClipboardList, Star, Activity, CheckCircle2 } from 'lucide-react'
import { translate, getCurrentLanguage } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getDashboardStats } from '../services/adminService'
import PeekRating from '../components/PeekRating'
import { ErrorState } from '../components/StatusState'
import CountUp from '../components/ui/CountUp'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { easeOut } from '../components/ui/motion'
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
  const reduceMotion = useReducedMotion()
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <svg width={180} height={180} viewBox="0 0 180 180" className="gauge" role="img" aria-label={`${percent}%`}>
      <defs>
        <linearGradient id="gaugeStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fdb78e" />
          <stop offset="100%" stopColor="#f19035" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r={radius} className="gauge-track" />
      <motion.circle
        cx="90"
        cy="90"
        r={radius}
        className="gauge-value"
        strokeDasharray={circumference}
        initial={reduceMotion ? false : { strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: easeOut, delay: 0.3 }}
      />
      <text x="90" y="88" textAnchor="middle" className="gauge-percent">
        {percent}%
      </text>
      <text x="90" y="112" textAnchor="middle" className="gauge-caption">
        {translate('adminDashboard.completionLegendDone')}
      </text>
    </svg>
  )
}

// شريط أفقي ينمو عند الظهور
function Bar({ label, value, total, tone }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className="bar-row">
      <div className="bar-labels">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track">
        <motion.span
          className={`bar-fill bar-fill--${tone}`}
          initial={reduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: pct(value, total) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: easeOut }}
        />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="adb-skeleton" aria-hidden="true">
      <div className="adb-skeleton-row">
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className="fx-skeleton" />
        ))}
      </div>
      <div className="adb-skeleton-row adb-skeleton-row--big">
        {[0, 1, 2].map((n) => (
          <span key={n} className="fx-skeleton" />
        ))}
      </div>
    </div>
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

  const today = new Date().toLocaleDateString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', {
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

  const userSegments = stats
    ? [
        { key: 'residents', label: translate('adminDashboard.residents'), value: stats.residentsCount, tone: 'navy' },
        { key: 'approved', label: translate('adminDashboard.approvedArtisans'), value: stats.approvedArtisansCount, tone: 'orange' },
        { key: 'pending', label: translate('adminDashboard.pendingArtisans'), value: stats.pendingArtisansCount, tone: 'sand' },
      ]
    : []

  return (
    <section className="adb">
      <Reveal className="adb-head">
        <p className="adb-greeting">
          {translate('adminDashboard.greeting')}
          {translate('common.comma')}
          {user.fullName}
        </p>
        <h1 className="fx-h1">{translate('adminDashboard.title')}</h1>
        <p className="adb-subtitle">
          {translate('adminDashboard.subtitle')} <span aria-hidden="true">·</span> <time>{today}</time>
        </p>
      </Reveal>

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('adminDashboard.loading')}
          </p>
          <DashboardSkeleton />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminDashboard.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminDashboard.retry')}
        />
      )}

      {!isLoading && !error && stats && (
        <>
          {/* مؤشرات رئيسية */}
          <RevealGroup className="adb-kpis" gap={0.06}>
            {[
              { label: translate('adminDashboard.totalRequests'), value: stats.totalRequestsCount, Icon: ClipboardList },
              { label: translate('adminDashboard.activeRequests'), value: stats.activeRequestsCount, Icon: Activity },
              { label: translate('adminDashboard.completedRequests'), value: stats.completedRequestsCount, Icon: CheckCircle2 },
              { label: translate('adminDashboard.usersTotal'), value: usersTotal, Icon: Users },
            ].map(({ label, value, Icon }) => (
              <RevealItem key={label} className="adb-kpi fx-card">
                <span className="adb-kpi-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <p className="adb-kpi-value">
                  <CountUp value={value} />
                </p>
                <p className="adb-kpi-label">{label}</p>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="adb-bento">
            {/* معدّل الإنجاز */}
            <Reveal as="section" className="adb-card adb-card--gauge fx-surface-depth">
              <h2 className="adb-card-title">
                <TrendingUp size={17} aria-hidden="true" />
                {translate('adminDashboard.completionCardTitle')}
              </h2>
              <div className="adb-gauge">
                <CompletionGauge percent={completionPercent} />
              </div>
              <div className="adb-legend adb-legend--center">
                <span>
                  <i className="adb-dot adb-dot--orange" />
                  {translate('adminDashboard.completionLegendDone')}
                </span>
                <span>
                  <i className="adb-dot adb-dot--ghost" />
                  {translate('adminDashboard.completionLegendRest')}
                </span>
              </div>
              <p className="adb-card-caption">{translate('adminDashboard.completionSubtitle')}</p>
            </Reveal>

            {/* الطلبات */}
            <Reveal as="section" className="adb-card fx-card" delay={0.05}>
              <h2 className="adb-card-title">
                <ClipboardList size={17} aria-hidden="true" />
                {translate('adminDashboard.requestsCardTitle')}
              </h2>
              <Bar label={translate('adminDashboard.activeRequests')} value={stats.activeRequestsCount} total={stats.totalRequestsCount} tone="orange" />
              <Bar label={translate('adminDashboard.completedRequests')} value={stats.completedRequestsCount} total={stats.totalRequestsCount} tone="green" />
              <Bar label={translate('adminDashboard.otherRequests')} value={otherRequests} total={stats.totalRequestsCount} tone="sand" />
              <p className="adb-total">
                <strong>{stats.totalRequestsCount}</strong>
                {translate('adminDashboard.totalRequests')}
              </p>
            </Reveal>

            {/* الحرفيون */}
            <Reveal as="section" className="adb-card fx-card" delay={0.1}>
              <h2 className="adb-card-title">
                <Wrench size={17} aria-hidden="true" />
                {translate('adminDashboard.artisansCardTitle')}
              </h2>
              <Bar label={translate('adminDashboard.approvedArtisans')} value={stats.approvedArtisansCount} total={stats.artisansCount} tone="navy" />
              <Bar label={translate('adminDashboard.pendingArtisans')} value={stats.pendingArtisansCount} total={stats.artisansCount} tone="sand" />
              <p className="adb-total">
                <strong>{stats.artisansCount}</strong>
                {translate('adminDashboard.artisansTotal')}
              </p>
            </Reveal>

            {/* المستخدمون */}
            <Reveal as="section" className="adb-card fx-card" delay={0.05}>
              <h2 className="adb-card-title">
                <Users size={17} aria-hidden="true" />
                {translate('adminDashboard.usersCardTitle')}
              </h2>
              <div className="adb-segments" aria-hidden="true">
                {userSegments.map(({ key, value, tone }) => (
                  <span
                    key={key}
                    className={`adb-segment adb-segment--${tone}`}
                    style={{ flexGrow: Math.max(value, 0.0001) }}
                  />
                ))}
              </div>
              <ul className="adb-legend">
                {userSegments.map(({ key, label, value, tone }) => (
                  <li key={key}>
                    <i className={`adb-dot adb-dot--${tone}`} />
                    {label}
                    <strong>{pct(value, usersTotal)}%</strong>
                  </li>
                ))}
              </ul>
              <p className="adb-total">
                <strong>{usersTotal}</strong>
                {translate('adminDashboard.usersTotal')}
              </p>
            </Reveal>

            {/* التقييم */}
            <Reveal as="section" className="adb-card adb-card--rating" delay={0.1}>
              <h2 className="adb-card-title">
                <Star size={17} aria-hidden="true" />
                {translate('adminDashboard.ratingCardTitle')}
              </h2>
              <p className="adb-rating">
                <span className="adb-rating-value">
                  {stats.averageRating ? <CountUp value={stats.averageRating} decimals={1} /> : '—'}
                </span>
                <span className="adb-rating-word">{ratingLabel(stats.averageRating)}</span>
              </p>
              <PeekRating
                value={Math.round(stats.averageRating)}
                readOnly
                size={22}
                activeColor="#263056"
                idleColor="rgba(38, 48, 86, 0.2)"
              />
              <p className="adb-card-caption">
                {stats.reviewsCount} {translate('adminDashboard.ratingCount')}
              </p>
            </Reveal>
          </div>
        </>
      )}
    </section>
  )
}

export default AdminDashboard
