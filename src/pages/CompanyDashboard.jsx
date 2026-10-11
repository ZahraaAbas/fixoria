import { useMemo } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  CircleSlash,
  ClipboardList,
  HardHat,
  Hourglass,
  Inbox,
  Star,
  Wrench,
} from 'lucide-react'
import { translate } from '../i18n'
import { getCompanyOverview, getCompanyPaymentsSummary, getCompanyRequests } from '../services/companyService'
import { useLoader } from '../hooks/useLoader'
import { requestsLink, useRange } from '../analytics/useRange'
import { periodStats } from '../analytics/requests'
import PaymentsSummaryCard from '../components/payments/PaymentsSummaryCard'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import DateRangeFilter from '../components/dashboard/DateRangeFilter'
import KpiCard from '../components/dashboard/KpiCard'
import ChartCard from '../components/dashboard/ChartCard'
import RankedBars from '../components/dashboard/RankedBars'
import TrendChart from '../components/dashboard/TrendChart'
import InsightsList from '../components/dashboard/InsightsList'
import './Owner.css'
import './Company.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

function CompanyDashboard() {
  const { range, preset, from, to, setRange } = useRange()
  const overview = useLoader(getCompanyOverview)
  const requests = useLoader(getCompanyRequests)

  const stats = useMemo(() => (requests.data ? periodStats(requests.data, range) : null), [requests.data, range])

  const isLoading = overview.isLoading || requests.isLoading
  const loadError = overview.error || requests.error
  const link = (filters) => requestsLink('/company/requests', range, filters)
  const info = overview.data

  return (
    <section className="ow cd">
      <PageHeader eyebrow={info?.companyName} title={translate('company.overview.title')} meta={translate('company.overview.subtitle')} />

      <div className="cd-toolbar">
        <DateRangeFilter key={preset} preset={preset} from={from} to={to} onChange={setRange} />
        <Link to={requestsLink('/company/demand', range)} className="fx-btn fx-btn--secondary fx-btn--sm">
          <Wrench size={15} aria-hidden="true" />
          {translate('company.nav.demand')}
        </Link>
      </div>

      {isLoading && <SkeletonList count={3} />}

      {loadError && (
        <ErrorState
          message={translate('owner.common.loadError')}
          onRetry={() => {
            overview.retry()
            requests.retry()
          }}
          retryLabel={translate('owner.common.retry')}
        />
      )}

      {info && !info.companyActive && (
        <p className="fx-notice fx-notice--danger" role="status">
          {translate('company.overview.paused')}
        </p>
      )}

      {info && stats && (
        <>
          <h2 className="cd-section-title">
            {translate('analytics.periodSection')}
            <span className="cd-section-note">{translate(`analytics.range.${preset === 'custom' ? 'customShort' : `last${range.days}`}`)}</span>
          </h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={Inbox}
                tone="accent"
                label={translate('analytics.kpi.created')}
                value={stats.created}
                delta={stats.createdChange}
                previous={stats.createdPrev}
                definition={translate('analytics.kpi.createdDef')}
                to={link()}
              />
            </li>
            <li>
              <KpiCard
                Icon={CircleCheck}
                tone="success"
                label={translate('analytics.kpi.completed')}
                value={stats.completed}
                delta={stats.completedChange}
                previous={stats.completedPrev}
                definition={translate('analytics.kpi.completedDef')}
                to={link({ status: 'completed', by: 'completed' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={CircleSlash}
                tone="warning"
                label={translate('analytics.kpi.closed')}
                value={stats.closed}
                delta={stats.closedChange}
                previous={stats.closedPrev}
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
                value={stats.rating.average != null ? `${stats.rating.average} ★` : null}
                definition={
                  stats.rating.count
                    ? fill('analytics.kpi.ratingDef', { n: stats.rating.count })
                    : translate('analytics.kpi.ratingNone')
                }
              />
            </li>
          </ul>

          <h2 className="cd-section-title">{translate('analytics.nowSection')}</h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={Hourglass}
                label={translate('analytics.kpi.pendingNow')}
                value={stats.pendingNow}
                definition={translate('analytics.kpi.pendingNowDef')}
                to={requestsLink('/company/requests', { preset: 'all' }, { status: 'pending' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={ClipboardList}
                label={translate('analytics.kpi.activeNow')}
                value={stats.activeNow}
                definition={translate('analytics.kpi.activeNowDef')}
                to={requestsLink('/company/requests', { preset: 'all' }, { status: 'active' })}
              />
            </li>
            <li>
              <KpiCard
                Icon={HardHat}
                label={translate('company.overview.artisans')}
                value={info.artisans}
                definition={fill('company.overview.activeOf', { active: info.activeArtisans, total: info.artisans })}
                to="/company/artisans"
              />
            </li>
          </ul>

          <div className="cd-grid">
            <ChartCard
              id="cd-top-services"
              title={translate('analytics.topServicesTitle')}
              subtitle={translate('analytics.topServicesQuestion')}
              isEmpty={stats.created === 0}
              emptyText={translate('analytics.noRequestsInRange')}
              actions={
                <Link to={requestsLink('/company/demand', range)} className="fx-btn fx-btn--ghost fx-btn--sm">
                  {translate('analytics.fullAnalysis')}
                  <ArrowLeft size={14} aria-hidden="true" className="icon-forward" />
                </Link>
              }
            >
              <RankedBars items={stats.services.filter((s) => s.count > 0)} limit={5} linkFor={(s) => link({ service: s.serviceId })} />
            </ChartCard>

            <ChartCard
              id="cd-insights"
              title={translate('analytics.insightsTitle')}
              subtitle={translate('analytics.insightsNote')}
              isEmpty={stats.insights.length === 0}
              emptyText={translate('analytics.insightsEmpty')}
            >
              <InsightsList insights={stats.insights} range={range} base="/company/requests" />
            </ChartCard>
          </div>

          <ChartCard
            id="cd-trend"
            title={translate('analytics.trendTitle')}
            subtitle={translate('analytics.trendQuestion')}
            isEmpty={stats.series.buckets.every((b) => b.created === 0 && b.completed === 0)}
            emptyText={translate('analytics.noRequestsInRange')}
          >
            <TrendChart series={stats.series} />
          </ChartCard>

          <ChartCard
            id="cd-artisans"
            title={translate('analytics.artisansTitle')}
            subtitle={translate('analytics.artisansQuestion')}
            isEmpty={stats.artisans.length === 0}
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
                  {stats.artisans.map((a) => (
                    <tr key={a.artisanId}>
                      <th scope="row">{a.name}</th>
                      <td className="num">{a.assigned}</td>
                      <td className="num">{a.active}</td>
                      <td className="num">{a.completed}</td>
                      <td className="num">
                        {a.rating.average != null ? `${a.rating.average} ★ (${a.rating.count})` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <PaymentsSummaryCard loader={getCompanyPaymentsSummary} />

          <h2 className="ow-panel-title">{translate('company.overview.compoundsTitle')}</h2>
          {info.compounds.length === 0 ? (
            <EmptyState icon={Building2} title={translate('company.overview.noCompounds')} />
          ) : (
            <ul className="ow-list">
              {info.compounds.map((compound) => (
                <li key={compound.id} className={`ow-card fx-card ${compound.isActive ? '' : 'is-inactive'}`}>
                  <div className="ow-card-head">
                    <span className="ow-card-icon" aria-hidden="true">
                      <Building2 size={20} />
                    </span>
                    <div className="ow-card-id">
                      <h3 className="ow-card-title">
                        {compound.name}
                        {!compound.isActive && (
                          <span className="fx-badge fx-badge--cancelled">{translate('owner.common.inactive')}</span>
                        )}
                      </h3>
                    </div>
                  </div>
                  <div className="ow-partners">
                    <p className="ow-label">
                      <Wrench size={13} aria-hidden="true" />
                      {translate('owner.agreements.services')}
                    </p>
                    <ul className="ow-chips">
                      {compound.serviceNames.map((name) => (
                        <li key={name} className="fx-badge fx-badge--plain fx-badge--accent">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default CompanyDashboard
