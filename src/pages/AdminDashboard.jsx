import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  CircleCheck,
  CircleSlash,
  ClipboardList,
  Inbox,
  MessageSquareWarning,
  Star,
  UserPlus,
  UserRoundCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { translate } from '../i18n'
import { useLoader } from '../hooks/useLoader'
import { getArtisanAccounts, getDashboardStats, getPaymentsSummary, getRequestsOverview, getResidents } from '../services/adminService'
import { getComplaints } from '../services/complaintsService'
import { requestsLink, useRange } from '../analytics/useRange'
import { periodStats, speedStats, stuckAccepted } from '../analytics/requests'
import SpeedKpis from '../components/dashboard/SpeedKpis'
import { parseApiDate } from '../utils/formatDate'
import PaymentsSummaryCard from '../components/payments/PaymentsSummaryCard'
import { ErrorState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import DateRangeFilter from '../components/dashboard/DateRangeFilter'
import KpiCard from '../components/dashboard/KpiCard'
import ChartCard from '../components/dashboard/ChartCard'
import RankedBars from '../components/dashboard/RankedBars'
import TrendChart from '../components/dashboard/TrendChart'
import InsightsList from '../components/dashboard/InsightsList'
import './Company.css'

// طلب معلّق بدون حرفي أكثر من هالمدة يعتبر عالق ويحتاج تدخل
const STALE_HOURS = 48

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

// مركز تحكم مشرف المجمع: شنو يحتاج تدخله هسه، وشلون ماشية الصيانة بالفترة
function AdminDashboard() {
  const { range, preset, from, to, setRange } = useRange()
  const loadAll = useCallback(
    () =>
      Promise.all([
        getRequestsOverview(),
        getResidents(),
        getComplaints(),
        getArtisanAccounts(),
        getDashboardStats(),
      ]),
    [],
  )
  const { data, error, isLoading, retry } = useLoader(loadAll)
  // وقت فتح الصفحة — منه نحسب الطلبات العالقة
  const [now] = useState(() => Date.now())

  const view = useMemo(() => {
    if (!data) return null
    const [requests, residents, complaints, artisans, totals] = data
    const unassigned = requests.filter((r) => r.status === 'pending' && r.artisanId == null)
    const stale = unassigned.filter((r) => r.createdAt && now - parseApiDate(r.createdAt).getTime() > STALE_HOURS * 3600 * 1000)
    return {
      compoundName: requests.find((r) => r.compoundName)?.compoundName,
      pendingResidents: residents.filter((r) => r.membershipStatus === 'pending').length,
      approvedResidents: residents.filter((r) => r.membershipStatus === 'approved').length,
      unassigned: unassigned.length,
      stale: stale.length,
      openComplaints: complaints.filter((c) => c.status !== 'resolved').length,
      newComplaints: complaints.filter((c) => c.status === 'open').length,
      activeArtisans: artisans.filter((a) => a.status === 'approved').length,
      artisans: artisans.length,
      totals,
      stats: periodStats(requests, range),
      speed: speedStats(requests, range),
      stuck: stuckAccepted(requests, now, STALE_HOURS).length,
    }
  }, [data, range, now])

  const link = (filters) => requestsLink('/admin/requests', range, filters)

  return (
    <section className="cd">
      <PageHeader
        eyebrow={view?.compoundName}
        title={translate('adminDashboard.title')}
        meta={translate('adminWorkspace.subtitle')}
      />

      {isLoading && <SkeletonList count={4} />}
      {error && <ErrorState message={translate('adminDashboard.error')} onRetry={retry} retryLabel={translate('adminDashboard.retry')} />}

      {view && (
        <>
          <h2 className="cd-section-title">{translate('artisanWorkspace.attention')}</h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={UserPlus}
                tone={view.pendingResidents ? 'accent' : 'default'}
                label={translate('adminWorkspace.kpi.pendingResidents')}
                value={view.pendingResidents}
                definition={translate('adminWorkspace.kpi.pendingResidentsDef')}
                to="/admin/residents"
              />
            </li>
            <li>
              <KpiCard
                Icon={Inbox}
                tone={view.stale ? 'warning' : 'default'}
                label={translate('adminWorkspace.kpi.unassigned')}
                value={view.unassigned}
                definition={
                  view.stale
                    ? fill('adminWorkspace.kpi.unassignedStale', { n: view.stale, hours: STALE_HOURS })
                    : translate('adminWorkspace.kpi.unassignedDef')
                }
                to={requestsLink('/admin/requests', { preset: 'all' }, { status: 'pending', artisan: 'none', sort: 'date-asc' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={MessageSquareWarning}
                tone={view.newComplaints ? 'warning' : 'default'}
                label={translate('adminWorkspace.kpi.complaints')}
                value={view.openComplaints}
                definition={fill('adminWorkspace.kpi.complaintsDef', { n: view.newComplaints })}
                to="/admin/complaints"
              />
            </li>
            <li>
              <KpiCard
                Icon={ClipboardList}
                tone={view.stuck ? 'warning' : 'navy'}
                label={translate('analytics.kpi.activeNow')}
                value={view.stats.activeNow}
                definition={
                  view.stuck
                    ? fill('speed.stuck', { n: view.stuck, hours: STALE_HOURS })
                    : translate('analytics.kpi.activeNowDef')
                }
                to={requestsLink('/admin/requests', { preset: 'all' }, { status: 'active' })}
              />
            </li>
          </ul>

          <div className="cd-toolbar">
            <h2 className="cd-section-title cd-section-title--inline">
              {translate('analytics.periodSection')}
            </h2>
            <DateRangeFilter key={preset} preset={preset} from={from} to={to} onChange={setRange} />
          </div>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={Inbox}
                tone="accent"
                label={translate('analytics.kpi.created')}
                value={view.stats.created}
                delta={view.stats.createdChange}
                previous={view.stats.createdPrev}
                definition={translate('analytics.kpi.createdDef')}
                to={link()}
              />
            </li>
            <li>
              <KpiCard
                Icon={CircleCheck}
                tone="success"
                label={translate('analytics.kpi.completed')}
                value={view.stats.completed}
                delta={view.stats.completedChange}
                previous={view.stats.completedPrev}
                definition={translate('analytics.kpi.completedDef')}
                to={link({ status: 'completed', by: 'completed' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={CircleSlash}
                tone="warning"
                label={translate('analytics.kpi.closed')}
                value={view.stats.closed}
                delta={view.stats.closedChange}
                previous={view.stats.closedPrev}
                deltaGood="down"
                definition={translate('analytics.kpi.closedDef')}
                to={link({ status: 'closed' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={Star}
                tone="navy"
                label={translate('analytics.kpi.rating')}
                value={view.stats.rating.average != null ? `${view.stats.rating.average} ★` : null}
                definition={
                  view.stats.rating.count
                    ? fill('analytics.kpi.ratingDef', { n: view.stats.rating.count })
                    : translate('analytics.kpi.ratingNone')
                }
                to="/admin/reviews"
              />
            </li>
          </ul>

          <h2 className="cd-section-title">{translate('speed.section')}</h2>
          <ul className="kpi-grid">
            <SpeedKpis speed={view.speed} />
          </ul>

          <div className="cd-grid">
            <ChartCard
              id="adm-top-services"
              title={translate('analytics.topServicesTitle')}
              subtitle={translate('analytics.topServicesQuestion')}
              isEmpty={view.stats.created === 0}
              emptyText={translate('analytics.noRequestsInRange')}
              actions={
                <Link to={link()} className="fx-btn fx-btn--ghost fx-btn--sm">
                  {translate('analytics.viewRequests')}
                  <ArrowLeft size={14} aria-hidden="true" className="icon-forward" />
                </Link>
              }
            >
              <RankedBars
                items={view.stats.services.filter((s) => s.count > 0)}
                limit={6}
                showStatus
                linkFor={(s) => link({ service: s.serviceId })}
              />
            </ChartCard>

            <ChartCard
              id="adm-insights"
              title={translate('analytics.insightsTitle')}
              subtitle={translate('analytics.insightsNote')}
              isEmpty={view.stats.insights.length === 0}
              emptyText={translate('analytics.insightsEmpty')}
            >
              <InsightsList insights={view.stats.insights} range={range} base="/admin/requests" />
            </ChartCard>
          </div>

          <ChartCard
            id="adm-trend"
            title={translate('analytics.trendTitle')}
            subtitle={translate('analytics.trendQuestion')}
            isEmpty={view.stats.series.buckets.every((b) => b.created === 0 && b.completed === 0)}
            emptyText={translate('analytics.noRequestsInRange')}
          >
            <TrendChart series={view.stats.series} />
          </ChartCard>

          <ChartCard
            id="adm-artisans"
            title={translate('analytics.artisansTitle')}
            subtitle={translate('adminWorkspace.artisansQuestion')}
            isEmpty={view.stats.artisans.length === 0}
            emptyText={translate('analytics.artisansEmpty')}
          >
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">{translate('analytics.table.artisan')}</th>
                    <th scope="col">{translate('analytics.table.assigned')}</th>
                    <th scope="col">{translate('analytics.table.active')}</th>
                    <th scope="col">{translate('analytics.table.completed')}</th>
                    <th scope="col">{translate('analytics.table.rating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.stats.artisans.map((a) => (
                    <tr key={a.artisanId}>
                      <th scope="row">
                        <Link to={link({ artisan: a.artisanId })} className="adm-artisan-link">
                          {a.name}
                        </Link>
                      </th>
                      <td className="num">{a.assigned}</td>
                      <td className="num">{a.active}</td>
                      <td className="num">{a.completed}</td>
                      <td className="num">{a.rating.average != null ? `${a.rating.average} ★ (${a.rating.count})` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <PaymentsSummaryCard loader={getPaymentsSummary} />

          <h2 className="cd-section-title">{translate('adminWorkspace.totalsSection')}</h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={UserRoundCheck}
                label={translate('adminWorkspace.kpi.residents')}
                value={view.approvedResidents}
                definition={translate('adminWorkspace.kpi.residentsDef')}
                to="/admin/residents"
              />
            </li>
            <li>
              <KpiCard
                Icon={Users}
                label={translate('adminWorkspace.kpi.artisans')}
                value={view.activeArtisans}
                definition={fill('company.overview.activeOf', { active: view.activeArtisans, total: view.artisans })}
                to="/admin/artisans"
              />
            </li>
            <li>
              <KpiCard
                Icon={Wrench}
                label={translate('adminWorkspace.kpi.allRequests')}
                value={view.totals.totalRequestsCount}
                definition={fill('adminWorkspace.kpi.allRequestsDef', { n: view.totals.completedRequestsCount })}
                to={requestsLink('/admin/requests', { preset: 'all' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={Star}
                label={translate('adminWorkspace.kpi.allRating')}
                value={view.totals.averageRating ? `${Math.round(view.totals.averageRating * 10) / 10} ★` : null}
                definition={fill('adminWorkspace.kpi.allRatingDef', { n: view.totals.reviewsCount })}
                to="/admin/reviews"
              />
            </li>
          </ul>
        </>
      )}
    </section>
  )
}

export default AdminDashboard
