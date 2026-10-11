import { useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  CircleCheck,
  Coffee,
  Hammer,
  Hourglass,
  Inbox,
  Star,
  Wallet,
} from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { useLoader } from '../hooks/useLoader'
import { getAvailableRequestsForArtisan, getRequestsForArtisan, getReviewsForArtisan } from '../services/requestsService'
import { useRange } from '../analytics/useRange'
import { change, MIN_SAMPLE, rankServices, speedStats, splitByRange, timeSeries } from '../analytics/requests'
import SpeedKpis from '../components/dashboard/SpeedKpis'
import { parseApiDate } from '../utils/formatDate'
import { formatIQD } from '../utils/money'
import { ErrorState, EmptyState } from '../components/StatusState'
import StatusBadge from '../components/ui/StatusBadge'
import { Reveal } from '../components/ui/Reveal'
import DateRangeFilter from '../components/dashboard/DateRangeFilter'
import KpiCard from '../components/dashboard/KpiCard'
import ChartCard from '../components/dashboard/ChartCard'
import RankedBars from '../components/dashboard/RankedBars'
import TrendChart from '../components/dashboard/TrendChart'
import './ArtisanDashboard.css'
import './Company.css'

const STAGES = ['accepted', 'in_progress', 'completed']

function within(value, start, end) {
  if (!value) return false
  const date = parseApiDate(value)
  return date >= start && date < end
}

function averageOf(reviews) {
  if (reviews.length === 0) return null
  return Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
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

// لوحة الحرفي: شنو يحتاج انتباهه هسه، وشلون ماشي شغله بالفترة المختارة
function ArtisanDashboard() {
  const { user } = useAuth()
  const { range, preset, from, to, setRange } = useRange()
  const loadAll = useCallback(
    () => Promise.all([getRequestsForArtisan(), getAvailableRequestsForArtisan(), getReviewsForArtisan()]),
    [],
  )
  const { data, error, isLoading, retry } = useLoader(loadAll)

  const stats = useMemo(() => {
    if (!data) return null
    const [mine, available, reviews] = data
    const { current, previous } = splitByRange(mine, range)
    const completedNow = mine.filter((r) => within(r.completedAt, range.start, range.end))
    const completedPrev = mine.filter((r) => within(r.completedAt, range.prevStart, range.prevEnd))
    const reviewsNow = reviews.filter((r) => within(r.createdAt, range.start, range.end))
    const valueNow = completedNow.reduce((sum, r) => sum + (r.price || 0), 0)
    const valuePrev = completedPrev.reduce((sum, r) => sum + (r.price || 0), 0)
    // نسبة الإنجاز: من طلبات الفترة الي انتهت (اكتملت أو انلغت بعد ما استلمتها)
    const finished = current.filter((r) => r.status === 'completed' || r.status === 'cancelled')
    const completionRate =
      finished.length >= MIN_SAMPLE
        ? Math.round((finished.filter((r) => r.status === 'completed').length / finished.length) * 100)
        : null
    return {
      available: available.length,
      accepted: mine.filter((r) => r.status === 'accepted').length,
      inProgress: mine.filter((r) => r.status === 'in_progress').length,
      cashPending: mine.filter((r) => r.status === 'completed' && r.price != null && r.paymentStatus !== 'paid').length,
      assigned: current.length,
      assignedChange: change(current.length, previous.length),
      assignedPrev: previous.length,
      completed: completedNow.length,
      completedChange: change(completedNow.length, completedPrev.length),
      completedPrev: completedPrev.length,
      value: valueNow,
      valueChange: completedPrev.length >= MIN_SAMPLE ? change(valueNow, valuePrev) : null,
      rating: averageOf(reviewsNow),
      ratingCount: reviewsNow.length,
      ratingAll: averageOf(reviews),
      ratingAllCount: reviews.length,
      completionRate,
      finishedCount: finished.length,
      services: rankServices(current, previous).filter((s) => s.count > 0),
      speed: speedStats(mine, range),
      series: timeSeries(mine, range),
      currentJob: mine.find((r) => r.status === 'in_progress') ?? mine.find((r) => r.status === 'accepted'),
    }
  }, [data, range])

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
    return <ErrorState message={translate('artisanDashboard.error')} onRetry={retry} retryLabel={translate('artisanDashboard.retry')} />
  }

  const workLink = (params) => `/artisan/my-work?${new URLSearchParams(params)}`
  const job = stats.currentJob
  const jobStage = job ? STAGES.indexOf(job.status) : -1

  return (
    <section className="ad cd">
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

      <h2 className="cd-section-title">{translate('artisanWorkspace.attention')}</h2>
      <ul className="kpi-grid">
        <li>
          <KpiCard
            Icon={Inbox}
            tone="accent"
            label={translate('artisanWorkspace.kpi.available')}
            value={stats.available}
            definition={translate('artisanWorkspace.kpi.availableDef')}
            to="/artisan/requests"
          />
        </li>
        <li>
          <KpiCard
            Icon={Hourglass}
            label={translate('artisanWorkspace.kpi.accepted')}
            value={stats.accepted}
            definition={translate('artisanWorkspace.kpi.acceptedDef')}
            to={workLink({ stage: 'accepted' })}
          />
        </li>
        <li>
          <KpiCard
            Icon={Hammer}
            tone="navy"
            label={translate('artisanWorkspace.kpi.inProgress')}
            value={stats.inProgress}
            definition={translate('artisanWorkspace.kpi.inProgressDef')}
            to={workLink({ stage: 'in_progress' })}
          />
        </li>
        <li>
          <KpiCard
            Icon={Banknote}
            tone={stats.cashPending ? 'warning' : 'default'}
            label={translate('artisanWorkspace.kpi.cashPending')}
            value={stats.cashPending}
            definition={translate('artisanWorkspace.kpi.cashPendingDef')}
            to={workLink({ stage: 'completed', pay: 'unpaid' })}
          />
        </li>
      </ul>

      <div className="cd-toolbar">
        <h2 className="cd-section-title cd-section-title--inline">{translate('analytics.periodSection')}</h2>
        <DateRangeFilter key={preset} preset={preset} from={from} to={to} onChange={setRange} />
      </div>
      <ul className="kpi-grid">
        <li>
          <KpiCard
            Icon={Briefcase}
            tone="accent"
            label={translate('artisanWorkspace.kpi.assigned')}
            value={stats.assigned}
            delta={stats.assignedChange}
            previous={stats.assignedPrev}
            definition={translate('artisanWorkspace.kpi.assignedDef')}
          />
        </li>
        <li>
          <KpiCard
            Icon={CircleCheck}
            tone="success"
            label={translate('artisanWorkspace.kpi.completed')}
            value={stats.completed}
            delta={stats.completedChange}
            previous={stats.completedPrev}
            definition={translate('analytics.kpi.completedDef')}
            to={workLink({ stage: 'completed' })}
          />
        </li>
        <li>
          <KpiCard
            Icon={Wallet}
            label={translate('artisanWorkspace.kpi.value')}
            value={formatIQD(stats.value)}
            delta={stats.valueChange}
            definition={translate('artisanWorkspace.kpi.valueDef')}
          />
        </li>
        <li>
          <KpiCard
            Icon={Star}
            tone="navy"
            label={translate('analytics.kpi.rating')}
            value={stats.rating != null ? `${stats.rating} ★` : null}
            definition={
              stats.ratingCount
                ? translate('artisanWorkspace.kpi.ratingDef').replace('{n}', stats.ratingCount)
                : stats.ratingAll != null
                  ? translate('artisanWorkspace.kpi.ratingAll')
                      .replace('{avg}', stats.ratingAll)
                      .replace('{n}', stats.ratingAllCount)
                  : translate('artisanWorkspace.kpi.ratingNone')
            }
            to="/artisan/reviews"
          />
        </li>
      </ul>

      <h2 className="cd-section-title">{translate('speed.mySection')}</h2>
      <ul className="kpi-grid">
        <SpeedKpis speed={stats.speed} acceptLabelKey="speed.myAccept" workLabelKey="speed.myWork" />
      </ul>

      <div className="cd-grid">
        <ChartCard id="ad-current" title={translate('artisanDashboard.currentTitle')} subtitle={translate('artisanWorkspace.currentQuestion')}>
          {job ? (
            <div className="ad-current">
              <div className="ad-current-head">
                <div>
                  <p className="ad-current-title">{job.title || job.categoryName}</p>
                  <p className="ad-current-meta">
                    {[job.categoryName, job.building, job.apartment].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
              <ol className="ad-steps">
                {STAGES.map((stage, index) => (
                  <li
                    key={stage}
                    className={`ad-step ${index < jobStage ? 'is-done' : ''} ${index === jobStage ? 'is-active' : ''}`}
                    aria-current={index === jobStage ? 'step' : undefined}
                  >
                    <span className="ad-step-bar" aria-hidden="true" />
                    <span className="ad-step-label">{translate(`requestStatus.${stage}`)}</span>
                  </li>
                ))}
              </ol>
              <Link to={workLink({ stage: job.status, open: job.id })} className="ad-current-link">
                {translate('artisanWorkspace.openJob')}
                <ArrowLeft size={16} aria-hidden="true" className="icon-forward" />
              </Link>
            </div>
          ) : (
            <EmptyState icon={Coffee} title={translate('artisanDashboard.noCurrent')} />
          )}
        </ChartCard>

        <ChartCard
          id="ad-services"
          title={translate('artisanWorkspace.servicesTitle')}
          subtitle={
            stats.completionRate != null
              ? translate('artisanWorkspace.completionRate')
                  .replace('{pct}', stats.completionRate)
                  .replace('{n}', stats.finishedCount)
              : translate('artisanWorkspace.servicesQuestion')
          }
          isEmpty={stats.services.length === 0}
          emptyText={translate('artisanWorkspace.noJobsInRange')}
        >
          <RankedBars items={stats.services} linkFor={(s) => workLink({ service: s.serviceId })} />
        </ChartCard>
      </div>

      <ChartCard
        id="ad-trend"
        title={translate('artisanWorkspace.trendTitle')}
        subtitle={translate('artisanWorkspace.trendQuestion')}
        isEmpty={stats.series.buckets.every((b) => b.created === 0 && b.completed === 0)}
        emptyText={translate('artisanWorkspace.noJobsInRange')}
      >
        <TrendChart series={stats.series} />
      </ChartCard>

      <p className="cd-scope">{translate('artisanWorkspace.dataNote')}</p>
    </section>
  )
}

export default ArtisanDashboard
