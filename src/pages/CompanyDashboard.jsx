import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Building2, CircleCheck, ClipboardList, HardHat, Inbox, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { getCompanyOverview } from '../services/companyService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import './Owner.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), translate(key))

function CompanyDashboard() {
  const [overview, setOverview] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    getCompanyOverview()
      .then((data) => {
        if (!isCancelled) setOverview(data)
      })
      .catch((err) => {
        if (!isCancelled) setLoadError(err)
      })
    return () => {
      isCancelled = true
    }
  }, [attempt])

  const tiles = overview && [
    {
      key: 'artisans',
      Icon: HardHat,
      value: overview.artisans,
      note: fill('company.overview.activeOf', { active: overview.activeArtisans, total: overview.artisans }),
      to: '/company/artisans',
    },
    { key: 'open', Icon: Inbox, value: overview.openRequests, to: '/company/requests' },
    { key: 'active', Icon: ClipboardList, value: overview.activeRequests, to: '/company/requests' },
    { key: 'completed', Icon: CircleCheck, value: overview.completedRequests },
  ]

  return (
    <section className="ow">
      <PageHeader
        eyebrow={overview?.companyName}
        title={translate('company.overview.title')}
        meta={translate('company.overview.subtitle')}
      />

      {!overview && !loadError && <SkeletonList count={3} />}

      {loadError && (
        <ErrorState
          message={translate('owner.common.loadError')}
          onRetry={() => {
            setLoadError(null)
            setAttempt((n) => n + 1)
          }}
          retryLabel={translate('owner.common.retry')}
        />
      )}

      {overview && !overview.companyActive && (
        <p className="fx-notice fx-notice--danger" role="status">
          {translate('company.overview.paused')}
        </p>
      )}

      {overview && (
        <>
          <RevealGroup as="ul" className="ow-stats">
            {tiles.map(({ key, Icon, value, note, to }) => (
              <RevealItem as="li" key={key} className="ow-stat fx-card">
                <span className="ow-stat-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <p className="ow-stat-value">{value}</p>
                <p className="ow-stat-label">{translate(`company.overview.${key}`)}</p>
                {note && <p className="ow-stat-note">{note}</p>}
                {to && (
                  <Link to={to} className="ow-stat-link">
                    {translate('owner.overview.manage')}
                    <ArrowLeft size={14} className="icon-forward" aria-hidden="true" />
                  </Link>
                )}
              </RevealItem>
            ))}
          </RevealGroup>

          <h2 className="ow-panel-title">{translate('company.overview.compoundsTitle')}</h2>
          {overview.compounds.length === 0 ? (
            <EmptyState icon={Building2} title={translate('company.overview.noCompounds')} />
          ) : (
            <ul className="ow-list">
              {overview.compounds.map((compound) => (
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
