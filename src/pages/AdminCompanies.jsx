import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Briefcase, Building2, ClipboardList, Phone, Search, Star, Users, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { useLoader } from '../hooks/useLoader'
import { getPartnerCompanies } from '../services/adminService'
import { requestsLink } from '../analytics/useRange'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import Avatar from '../components/ui/Avatar'
import './AdminCompanies.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

const ALL_TIME = { preset: 'all' }

// شركات الصيانة المتعاونة ويه المجمع: كل شركة بخدماتها (حسب الاتفاقية) وحرفييها وشغلهم.
// للاطلاع: الشركات تضيف حرفييها وتوقفهم، والمالك يدير الاتفاقيات.
function AdminCompanies() {
  const { data, error, isLoading, retry } = useLoader(getPartnerCompanies)
  const [q, setQ] = useState('')

  const companies = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term || !data) return data || []
    // البحث باسم الشركة أو الخدمة يرجّع الشركة كاملة؛ وباسم الحرفي يرجّعها بحرفييها المطابقين بس
    return data
      .map((c) => {
        const companyHit = [c.name, ...c.serviceNames].some((x) => x?.toLowerCase().includes(term))
        if (companyHit) return c
        const artisans = c.artisans.filter((a) => [a.fullName, ...(a.categoryNames || [])].some((x) => x?.toLowerCase().includes(term)))
        return artisans.length ? { ...c, artisans } : null
      })
      .filter(Boolean)
  }, [data, q])

  const totals = data && {
    companies: data.length,
    artisans: data.reduce((n, c) => n + c.artisans.length, 0),
    services: new Set(data.flatMap((c) => c.serviceIds)).size,
  }

  return (
    <section className="acm">
      <PageHeader title={translate('adminCompanies.title')} meta={translate('adminCompanies.subtitle')} />

      {totals && totals.companies > 0 && (
        <div className="acm-toolbar">
          <p className="acm-totals">{fill('adminCompanies.totals', totals)}</p>
          <label className="acm-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{translate('adminCompanies.search')}</span>
            <input
              type="search"
              className="fx-input"
              placeholder={translate('adminCompanies.search')}
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </label>
        </div>
      )}

      {isLoading && <SkeletonList count={3} />}
      {error && <ErrorState message={translate('owner.common.loadError')} onRetry={retry} retryLabel={translate('owner.common.retry')} />}

      {data && data.length === 0 && (
        <EmptyState icon={Building2} title={translate('adminCompanies.empty')} message={translate('adminCompanies.emptyHint')} />
      )}
      {data && data.length > 0 && companies.length === 0 && (
        <EmptyState icon={Search} title={translate('requestsTable.emptyFiltered')} />
      )}

      <ul className="acm-list">
        {companies.map((company) => {
          const active = company.artisans.filter((a) => a.status === 'approved').length
          return (
            <li key={company.id} className="acm-card fx-card">
              <header className="acm-head">
                <span className="acm-icon" aria-hidden="true">
                  <Building2 size={22} />
                </span>
                <div className="acm-id">
                  <h2 className="acm-name">{company.name}</h2>
                  {company.phone && (
                    <p className="acm-phone" dir="ltr">
                      <Phone size={13} aria-hidden="true" />
                      {company.phone}
                    </p>
                  )}
                </div>
                <div className="acm-stats">
                  <span className="acm-stat">
                    <Users size={14} aria-hidden="true" />
                    {fill('adminCompanies.artisansCount', { active, total: company.artisans.length })}
                  </span>
                  {company.openRequests > 0 && (
                    <Link
                      to={requestsLink('/admin/requests', ALL_TIME, { status: 'pending', artisan: 'none' })}
                      className="acm-stat acm-stat--warn"
                    >
                      <ClipboardList size={14} aria-hidden="true" />
                      {fill('adminCompanies.openRequests', { n: company.openRequests })}
                    </Link>
                  )}
                </div>
              </header>

              <div className="acm-services">
                <p className="acm-label">
                  <Wrench size={13} aria-hidden="true" />
                  {translate('adminCompanies.services')}
                </p>
                <ul className="acm-chips">
                  {company.serviceNames.map((name) => (
                    <li key={name} className="fx-badge fx-badge--plain fx-badge--accent">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>

              {company.artisans.length === 0 ? (
                <p className="acm-none">{translate('adminCompanies.noArtisans')}</p>
              ) : (
                <ul className="acm-artisans">
                  {company.artisans.map((a) => (
                    <li key={a.id} className={`acm-artisan ${a.status === 'approved' ? '' : 'is-paused'}`}>
                      <Avatar src={a.avatar} name={a.fullName} className="acm-avatar" />
                      <div className="acm-artisan-id">
                        <p className="acm-artisan-name">
                          {a.fullName}
                          {a.status !== 'approved' && (
                            <span className="fx-badge fx-badge--cancelled">{translate('owner.common.inactive')}</span>
                          )}
                        </p>
                        <p className="acm-artisan-meta">
                          {(a.categoryNames || []).join(translate('common.comma'))}
                          {a.phone && (
                            <span dir="ltr">
                              {' · '}
                              {a.phone}
                            </span>
                          )}
                        </p>
                      </div>
                      <dl className="acm-artisan-stats">
                        <div>
                          <dt>
                            <Star size={13} aria-hidden="true" />
                            <span className="sr-only">{translate('analytics.table.rating')}</span>
                          </dt>
                          <dd>{a.rating != null ? `${Math.round(a.rating * 10) / 10} (${a.reviewsCount})` : '—'}</dd>
                        </div>
                        <div>
                          <dt>
                            <Briefcase size={13} aria-hidden="true" />
                            <span className="sr-only">{translate('analytics.table.active')}</span>
                          </dt>
                          <dd>{fill('adminCompanies.activeJobs', { n: a.activeJobs })}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">{translate('analytics.table.completed')}</dt>
                          <dd>{fill('adminCompanies.completedJobs', { n: a.completedJobs })}</dd>
                        </div>
                      </dl>
                      <Link to={requestsLink('/admin/requests', ALL_TIME, { artisan: a.id })} className="acm-link">
                        {translate('adminCompanies.viewRequests')}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <p className="acm-note">{translate('adminCompanies.note')}</p>
    </section>
  )
}

export default AdminCompanies
