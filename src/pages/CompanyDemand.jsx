import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Building2, CalendarClock, Info } from 'lucide-react'
import { getCurrentLanguage, translate } from '../i18n'
import { getCompanyRequests } from '../services/companyService'
import { useLoader } from '../hooks/useLoader'
import { requestsLink, useRange } from '../analytics/useRange'
import { buildInsights, groupByCompound, peakTimes, rankServices, splitByRange } from '../analytics/requests'
import { ErrorState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import DateRangeFilter from '../components/dashboard/DateRangeFilter'
import ChartCard from '../components/dashboard/ChartCard'
import RankedBars from '../components/dashboard/RankedBars'
import InsightsList from '../components/dashboard/InsightsList'
import './Company.css'

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] // السبت أول الأسبوع

function weekdayName(day) {
  // 2026-10-04 يوم أحد (getDay = 0)، فنزيد عليه رقم اليوم
  const date = new Date(2026, 9, 4 + day)
  return date.toLocaleDateString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', { weekday: 'long' })
}

// تحليل طلب الخدمات: أي الخدمات أكثر طلبًا، شلون تتغير، وين وشوكت
function CompanyDemand() {
  const { range, preset, from, to, setRange } = useRange()
  const [params, setParams] = useSearchParams()
  const compoundFilter = params.get('compound') || ''
  const requests = useLoader(getCompanyRequests)

  const compounds = useMemo(() => (requests.data ? groupByCompound(requests.data).filter((c) => c.compoundId != null) : []), [requests.data])

  const stats = useMemo(() => {
    if (!requests.data) return null
    const scoped = compoundFilter ? requests.data.filter((r) => String(r.compoundId) === compoundFilter) : requests.data
    const { current, previous } = splitByRange(scoped, range)
    const services = rankServices(current, previous)
    const byCompound = groupByCompound(current).map((c) => ({
      key: c.compoundId ?? 'none',
      name: c.name || translate('analytics.unknownCompound'),
      count: c.count,
      share: current.length ? Math.round((c.count / current.length) * 100) : 0,
      compoundId: c.compoundId,
    }))
    const peaks = peakTimes(current)
    return {
      total: current.length,
      services,
      byCompound,
      weekdays: WEEK_ORDER.map((day) => ({ key: day, name: weekdayName(day), count: peaks.weekdays[day] })),
      dayparts: Object.entries(peaks.dayparts).map(([key, count]) => ({ key, name: translate(`analytics.dayparts.${key}`), count })),
      insights: buildInsights({ current, previous, services }),
    }
  }, [requests.data, range, compoundFilter])

  const filters = (extra = {}) => ({ compound: compoundFilter, ...extra })
  const link = (extra) => requestsLink('/company/requests', range, filters(extra))

  function setCompound(value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set('compound', value)
        else next.delete('compound')
        return next
      },
      { replace: true },
    )
  }

  return (
    <section className="cd">
      <PageHeader title={translate('company.demand.title')} meta={translate('company.demand.subtitle')} />

      <div className="cd-toolbar">
        <DateRangeFilter key={preset} preset={preset} from={from} to={to} onChange={setRange} />
        {compounds.length > 1 && (
          <label className="cd-select">
            <Building2 size={15} aria-hidden="true" />
            <span className="sr-only">{translate('analytics.compoundFilter')}</span>
            <select className="fx-input" value={compoundFilter} onChange={(event) => setCompound(event.target.value)}>
              <option value="">{translate('analytics.allCompounds')}</option>
              {compounds.map((c) => (
                <option key={c.compoundId} value={c.compoundId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="cd-scope">
        <Info size={15} aria-hidden="true" />
        {translate('company.demand.scope')}
      </p>

      {requests.isLoading && <SkeletonList count={3} />}
      {requests.error && (
        <ErrorState message={translate('owner.common.loadError')} onRetry={requests.retry} retryLabel={translate('owner.common.retry')} />
      )}

      {stats && (
        <>
          <ChartCard
            id="dm-ranking"
            className="cd-hero-card"
            title={translate('analytics.topServicesTitle')}
            subtitle={translate('company.demand.rankingNote').replace('{n}', stats.total)}
            isEmpty={stats.total === 0}
            emptyText={translate('analytics.noRequestsInRange')}
          >
            <RankedBars items={stats.services.filter((s) => s.count > 0)} showStatus linkFor={(s) => link({ service: s.serviceId })} />
          </ChartCard>

          <div className="cd-grid">
            <ChartCard
              id="dm-insights"
              title={translate('analytics.insightsTitle')}
              subtitle={translate('analytics.insightsNote')}
              isEmpty={stats.insights.length === 0}
              emptyText={translate('analytics.insightsEmpty')}
            >
              <InsightsList insights={stats.insights} range={range} base="/company/requests" />
            </ChartCard>

            <ChartCard
              id="dm-compounds"
              title={translate('company.demand.byCompoundTitle')}
              subtitle={translate('company.demand.byCompoundQuestion')}
              isEmpty={stats.total === 0}
              emptyText={translate('analytics.noRequestsInRange')}
            >
              <RankedBars items={stats.byCompound} linkFor={(c) => (c.compoundId != null ? link({ compound: c.compoundId }) : null)} />
            </ChartCard>
          </div>

          <ChartCard
            id="dm-table"
            title={translate('company.demand.tableTitle')}
            subtitle={translate('company.demand.tableQuestion')}
            isEmpty={stats.total === 0}
            emptyText={translate('analytics.noRequestsInRange')}
          >
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">{translate('analytics.table.service')}</th>
                    <th scope="col">{translate('analytics.table.requests')}</th>
                    <th scope="col">{translate('analytics.table.share')}</th>
                    <th scope="col">{translate('analytics.table.change')}</th>
                    <th scope="col">{translate('analytics.table.pending')}</th>
                    <th scope="col">{translate('analytics.table.active')}</th>
                    <th scope="col">{translate('analytics.table.completed')}</th>
                    <th scope="col">{translate('analytics.table.closed')}</th>
                    <th scope="col">{translate('analytics.table.rating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.services.filter((s) => s.count > 0).map((s) => (
                    <tr key={s.serviceId}>
                      <th scope="row">{s.name}</th>
                      <td className="num">{s.count}</td>
                      <td className="num">{s.share}%</td>
                      <td className="num">{s.change == null ? '—' : `${s.change > 0 ? '+' : ''}${s.change}%`}</td>
                      <td className="num">{s.statuses.pending}</td>
                      <td className="num">{s.statuses.accepted + s.statuses.in_progress}</td>
                      <td className="num">{s.completed}</td>
                      <td className="num">{s.cancelled}</td>
                      <td className="num">{s.rating.average != null ? `${s.rating.average} ★ (${s.rating.count})` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cd-footnote">{translate('company.demand.changeNote')}</p>
          </ChartCard>

          <div className="cd-grid">
            <ChartCard
              id="dm-weekdays"
              title={
                <>
                  <CalendarClock size={18} aria-hidden="true" className="cd-title-icon" />
                  {translate('company.demand.weekdaysTitle')}
                </>
              }
              subtitle={translate('company.demand.peakQuestion')}
              isEmpty={stats.total === 0}
              emptyText={translate('analytics.noRequestsInRange')}
            >
              <RankedBars items={stats.weekdays} ranked={false} />
            </ChartCard>

            <ChartCard
              id="dm-dayparts"
              title={translate('company.demand.daypartsTitle')}
              subtitle={translate('company.demand.daypartsNote')}
              isEmpty={stats.total === 0}
              emptyText={translate('analytics.noRequestsInRange')}
            >
              <RankedBars items={stats.dayparts} ranked={false} />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  )
}

export default CompanyDemand
