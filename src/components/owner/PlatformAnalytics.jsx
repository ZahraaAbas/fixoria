import { useCallback, useMemo } from 'react'
import { CircleCheck, CircleSlash, Inbox, Star, UserPlus } from 'lucide-react'
import { translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { useRange } from '../../analytics/useRange'
import { periodStats, speedStats } from '../../analytics/requests'
import { getPlatformRequests, getSignups } from '../../services/ownerService'
import { parseApiDate } from '../../utils/formatDate'
import { ErrorState, SkeletonList } from '../StatusState'
import DateRangeFilter from '../dashboard/DateRangeFilter'
import KpiCard from '../dashboard/KpiCard'
import ChartCard from '../dashboard/ChartCard'
import RankedBars from '../dashboard/RankedBars'
import TrendChart from '../dashboard/TrendChart'
import SpeedKpis from '../dashboard/SpeedKpis'
import InsightsList from '../dashboard/InsightsList'

const SIGNUP_ROLES = ['customer', 'artisan', 'admin', 'company_manager']

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

function shareRows(groups, total) {
  return groups
    .map((g) => ({ ...g, share: total ? Math.round((g.count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
}

// تحليلات الطلبات على مستوى المنصة للمالك (كل المجمعات) — بدون أسماء أشخاص
function PlatformAnalytics({ companies }) {
  const { range, preset, from, to, setRange } = useRange()
  const loadAll = useCallback(() => Promise.all([getPlatformRequests(), getSignups()]), [])
  const { data, error, isLoading, retry } = useLoader(loadAll)

  const view = useMemo(() => {
    if (!data) return null
    const [requests, signups] = data
    const stats = periodStats(requests, range)
    const inRange = (value) => {
      const date = parseApiDate(value)
      return date >= range.start && date < range.end
    }
    const current = requests.filter((r) => inRange(r.createdAt))
    const companyName = new Map(companies.map((c) => [c.id, c.name]))
    const byCompany = new Map()
    for (const r of current) {
      if (r.companyId == null) continue
      byCompany.set(r.companyId, (byCompany.get(r.companyId) || 0) + 1)
    }
    const byCompound = new Map()
    for (const r of current) {
      const key = r.compoundId ?? 'none'
      if (!byCompound.has(key)) byCompound.set(key, { key, name: r.compoundName || translate('analytics.unknownCompound'), count: 0 })
      byCompound.get(key).count += 1
    }
    const signupsInRange = signups.filter((s) => inRange(s.createdAt))
    return {
      stats,
      speed: speedStats(requests, range),
      byCompany: shareRows(
        [...byCompany.entries()].map(([id, count]) => ({ key: id, name: companyName.get(id) || `#${id}`, count })),
        current.length,
      ),
      byCompound: shareRows([...byCompound.values()], current.length),
      signups: SIGNUP_ROLES.map((role) => ({ key: role, name: translate(`ownerWorkspace.roles.${role}`), count: signupsInRange.filter((s) => s.role === role).length })),
      signupsTotal: signupsInRange.length,
      firstSignup: signups[0]?.createdAt || null,
    }
  }, [data, range, companies])

  return (
    <section className="cd owp" aria-labelledby="owp-title">
      <div className="cd-toolbar">
        <h2 id="owp-title" className="cd-section-title cd-section-title--inline">
          {translate('ownerWorkspace.analyticsSection')}
        </h2>
        <DateRangeFilter key={preset} preset={preset} from={from} to={to} onChange={setRange} />
      </div>

      {isLoading && <SkeletonList count={2} />}
      {error && <ErrorState message={translate('owner.common.loadError')} onRetry={retry} retryLabel={translate('owner.common.retry')} />}

      {view && (
        <>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={Inbox}
                tone="accent"
                label={translate('analytics.kpi.created')}
                value={view.stats.created}
                delta={view.stats.createdChange}
                previous={view.stats.createdPrev}
                definition={translate('ownerWorkspace.createdDef')}
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
              />
            </li>
            <SpeedKpis speed={view.speed} />
          </ul>

          <div className="cd-grid">
            <ChartCard
              id="owp-services"
              title={translate('analytics.topServicesTitle')}
              subtitle={translate('ownerWorkspace.servicesQuestion')}
              isEmpty={view.stats.created === 0}
              emptyText={translate('analytics.noRequestsInRange')}
            >
              <RankedBars items={view.stats.services.filter((s) => s.count > 0)} limit={6} showStatus />
            </ChartCard>

            <ChartCard
              id="owp-insights"
              title={translate('analytics.insightsTitle')}
              subtitle={translate('analytics.insightsNote')}
              isEmpty={view.stats.insights.length === 0}
              emptyText={translate('analytics.insightsEmpty')}
            >
              {/* المالك ما عنده صفحة طلبات، فالملاحظات بدون روابط */}
              <InsightsList insights={view.stats.insights.map((i) => ({ ...i, filter: null }))} range={range} />
            </ChartCard>
          </div>

          <ChartCard
            id="owp-trend"
            title={translate('analytics.trendTitle')}
            subtitle={translate('analytics.trendQuestion')}
            isEmpty={view.stats.series.buckets.every((b) => b.created === 0 && b.completed === 0)}
            emptyText={translate('analytics.noRequestsInRange')}
          >
            <TrendChart series={view.stats.series} />
          </ChartCard>

          <div className="cd-grid">
            <ChartCard
              id="owp-compounds"
              title={translate('ownerWorkspace.periodByCompound')}
              subtitle={translate('ownerWorkspace.byCompoundQuestion')}
              isEmpty={view.byCompound.length === 0}
              emptyText={translate('analytics.noRequestsInRange')}
            >
              <RankedBars items={view.byCompound} />
            </ChartCard>

            <ChartCard
              id="owp-companies"
              title={translate('ownerWorkspace.byCompanyTitle')}
              subtitle={translate('ownerWorkspace.byCompanyQuestion')}
              isEmpty={view.byCompany.length === 0}
              emptyText={translate('ownerWorkspace.byCompanyEmpty')}
            >
              <RankedBars items={view.byCompany} />
            </ChartCard>
          </div>

          <ChartCard
            id="owp-signups"
            title={
              <>
                <UserPlus size={18} aria-hidden="true" className="cd-title-icon" />
                {fill('ownerWorkspace.signupsTitle', { n: view.signupsTotal })}
              </>
            }
            subtitle={translate('ownerWorkspace.signupsNote')}
            isEmpty={view.signupsTotal === 0}
            emptyText={translate('ownerWorkspace.signupsEmpty')}
          >
            <RankedBars items={view.signups} ranked={false} />
          </ChartCard>
        </>
      )}
    </section>
  )
}

export default PlatformAnalytics
