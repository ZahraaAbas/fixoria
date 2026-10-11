import { useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Handshake,
  HardHat,
  Info,
  ShieldAlert,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'
import { translate } from '../i18n'
import { useLoader } from '../hooks/useLoader'
import { getAgreements, getCompanies, getCompounds, getOwnerOverview } from '../services/ownerService'
import { getCategories } from '../services/categoriesService'
import { ErrorState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import KpiCard from '../components/dashboard/KpiCard'
import ChartCard from '../components/dashboard/ChartCard'
import RankedBars from '../components/dashboard/RankedBars'
import PlatformAnalytics from '../components/owner/PlatformAnalytics'
import './Owner.css'
import './Company.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

// صحة المنصة من بيانات الإعداد المتوفرة: المجمعات والشركات والاتفاقيات (من البداية، بدون فترات)
function OwnerDashboard() {
  const loadAll = useCallback(
    () => Promise.all([getOwnerOverview(), getCompounds(), getCompanies(), getAgreements(), getCategories()]),
    [],
  )
  const { data, error, isLoading, retry } = useLoader(loadAll)

  const view = useMemo(() => {
    if (!data) return null
    const [stats, compounds, companies, agreements, services] = data
    const activeCompounds = compounds.filter((c) => c.isActive)
    const activeCompanies = companies.filter((c) => c.isActive)
    // الخدمات المغطاة بكل مجمع = اتحاد خدمات اتفاقياته الفعّالة
    const covered = new Map(activeCompounds.map((c) => [c.id, new Set()]))
    for (const a of agreements) {
      if (a.isActive && covered.has(a.compoundId)) a.serviceIds.forEach((id) => covered.get(a.compoundId).add(id))
    }
    const coverage = activeCompounds
      .map((c) => ({
        ...c,
        coveredCount: covered.get(c.id).size,
        missing: services.filter((s) => !covered.get(c.id).has(s.id)),
      }))
      .sort((a, b) => b.missing.length - a.missing.length || a.name.localeCompare(b.name))
    const totalRequests = compounds.reduce((sum, c) => sum + c.requests, 0)
    return {
      stats,
      compounds,
      companies,
      services,
      noAdmin: activeCompounds.filter((c) => c.admins.length === 0),
      noCompany: activeCompounds.filter((c) => c.companies.length === 0),
      noManager: activeCompanies.filter((c) => c.managers.length === 0),
      noArtisans: activeCompanies.filter((c) => c.artisans === 0),
      coverage,
      byCompound: compounds
        .filter((c) => c.requests > 0)
        .map((c) => ({
          key: c.id,
          name: c.name,
          count: c.requests,
          share: totalRequests ? Math.round((c.requests / totalRequests) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),
    }
  }, [data])

  const names = (list) => list.map((x) => x.name).join('، ')

  return (
    <section className="ow cd">
      <PageHeader title={translate('owner.overview.title')} meta={translate('ownerWorkspace.subtitle')} />

      {isLoading && <SkeletonList count={3} />}
      {error && <ErrorState message={translate('owner.common.loadError')} onRetry={retry} retryLabel={translate('owner.common.retry')} />}

      {view && (
        <>
          <h2 className="cd-section-title">{translate('ownerWorkspace.setupSection')}</h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={UserCog}
                tone={view.noAdmin.length ? 'warning' : 'success'}
                label={translate('ownerWorkspace.kpi.noAdmin')}
                value={view.noAdmin.length}
                definition={view.noAdmin.length ? names(view.noAdmin) : translate('ownerWorkspace.kpi.noAdminOk')}
                to="/owner/compounds"
              />
            </li>
            <li>
              <KpiCard
                Icon={Handshake}
                tone={view.noCompany.length ? 'warning' : 'success'}
                label={translate('ownerWorkspace.kpi.noCompany')}
                value={view.noCompany.length}
                definition={view.noCompany.length ? names(view.noCompany) : translate('ownerWorkspace.kpi.noCompanyOk')}
                to="/owner/agreements"
              />
            </li>
            <li>
              <KpiCard
                Icon={ShieldAlert}
                tone={view.noManager.length ? 'warning' : 'success'}
                label={translate('ownerWorkspace.kpi.noManager')}
                value={view.noManager.length}
                definition={view.noManager.length ? names(view.noManager) : translate('ownerWorkspace.kpi.noManagerOk')}
                to="/owner/companies"
              />
            </li>
            <li>
              <KpiCard
                Icon={HardHat}
                tone={view.noArtisans.length ? 'warning' : 'success'}
                label={translate('ownerWorkspace.kpi.noArtisans')}
                value={view.noArtisans.length}
                definition={view.noArtisans.length ? names(view.noArtisans) : translate('ownerWorkspace.kpi.noArtisansOk')}
                to="/owner/companies"
              />
            </li>
          </ul>

          <h2 className="cd-section-title">{translate('ownerWorkspace.platformSection')}</h2>
          <ul className="kpi-grid">
            <li>
              <KpiCard
                Icon={Building2}
                tone="accent"
                label={translate('owner.overview.compounds')}
                value={view.stats.compounds}
                definition={fill('owner.overview.activeOf', { active: view.stats.activeCompounds, total: view.stats.compounds })}
                to="/owner/compounds"
              />
            </li>
            <li>
              <KpiCard
                Icon={Wrench}
                label={translate('owner.overview.companies')}
                value={view.stats.companies}
                definition={fill('ownerWorkspace.kpi.agreementsDef', { n: view.stats.activeAgreements })}
                to="/owner/companies"
              />
            </li>
            <li>
              <KpiCard
                Icon={Users}
                label={translate('owner.overview.residents')}
                value={view.stats.residents}
                definition={fill('owner.overview.pending', { n: view.stats.pendingResidents })}
              />
            </li>
            <li>
              <KpiCard
                Icon={ClipboardList}
                tone="navy"
                label={translate('owner.overview.requests')}
                value={view.stats.requests}
                definition={fill('owner.overview.open', { n: view.stats.openRequests })}
              />
            </li>
          </ul>

          <PlatformAnalytics companies={view.companies} />

          <div className="cd-grid">
            <ChartCard
              id="ow-coverage"
              title={translate('ownerWorkspace.coverageTitle')}
              subtitle={translate('ownerWorkspace.coverageQuestion')}
              isEmpty={view.coverage.length === 0}
              emptyText={translate('ownerWorkspace.noCompounds')}
              actions={
                <Link to="/owner/agreements" className="fx-btn fx-btn--ghost fx-btn--sm">
                  {translate('owner.nav.agreements')}
                  <ArrowLeft size={14} aria-hidden="true" className="icon-forward" />
                </Link>
              }
            >
              <ul className="owc-list">
                {view.coverage.map((c) => (
                  <li key={c.id} className="owc-item">
                    <div className="owc-head">
                      <strong>{c.name}</strong>
                      <span className={`fx-badge ${c.missing.length ? 'fx-badge--accepted' : 'fx-badge--completed'}`}>
                        {fill('ownerWorkspace.coveredOf', { n: c.coveredCount, total: view.services.length })}
                      </span>
                    </div>
                    {c.missing.length > 0 ? (
                      <p className="owc-missing">
                        <span>{translate('ownerWorkspace.missingServices')}</span>
                        {c.missing.map((s) => (
                          <span key={s.id} className="fx-badge fx-badge--plain">
                            {s.name}
                          </span>
                        ))}
                      </p>
                    ) : (
                      <p className="owc-ok">{translate('ownerWorkspace.allCovered')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </ChartCard>

            <ChartCard
              id="ow-demand"
              title={translate('ownerWorkspace.byCompoundTitle')}
              subtitle={translate('ownerWorkspace.byCompoundQuestion')}
              isEmpty={view.byCompound.length === 0}
              emptyText={translate('ownerWorkspace.noRequests')}
            >
              <RankedBars items={view.byCompound} />
            </ChartCard>
          </div>

          <ChartCard id="ow-compounds" title={translate('ownerWorkspace.tableTitle')} subtitle={translate('ownerWorkspace.tableQuestion')}>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th scope="col">{translate('ownerWorkspace.table.compound')}</th>
                    <th scope="col">{translate('ownerWorkspace.table.status')}</th>
                    <th scope="col">{translate('ownerWorkspace.table.admins')}</th>
                    <th scope="col">{translate('ownerWorkspace.table.companies')}</th>
                    <th scope="col">{translate('ownerWorkspace.table.residents')}</th>
                    <th scope="col">{translate('ownerWorkspace.table.requests')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...view.compounds]
                    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.requests - a.requests)
                    .map((c) => (
                      <tr key={c.id}>
                        <th scope="row">{c.name}</th>
                        <td>
                          <span className={`fx-badge ${c.isActive ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
                            {translate(c.isActive ? 'owner.common.active' : 'owner.common.inactive')}
                          </span>
                        </td>
                        <td>{c.admins.length ? names(c.admins) : <span className="owc-gap">{translate('ownerWorkspace.none')}</span>}</td>
                        <td>{c.companies.length ? c.companies.join('، ') : <span className="owc-gap">{translate('ownerWorkspace.none')}</span>}</td>
                        <td className="num">
                          {c.residents}
                          {c.pendingResidents > 0 && (
                            <span className="owc-pending"> {fill('ownerWorkspace.pendingShort', { n: c.pendingResidents })}</span>
                          )}
                        </td>
                        <td className="num">{c.requests}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <section className="owc-note fx-card" aria-labelledby="owc-note-title">
            <Info size={18} aria-hidden="true" />
            <div>
              <h2 id="owc-note-title">{translate('ownerWorkspace.limitsTitle')}</h2>
              <p>{translate('ownerWorkspace.limitsText')}</p>
            </div>
          </section>
        </>
      )}
    </section>
  )
}

export default OwnerDashboard
