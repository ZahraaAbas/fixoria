import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Building2, ClipboardList, Handshake, HardHat, Users, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { getOwnerOverview } from '../services/ownerService'
import { ErrorState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import './Owner.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), translate(key))

function OwnerDashboard() {
  const [stats, setStats] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    getOwnerOverview()
      .then((data) => {
        if (!isCancelled) setStats(data)
      })
      .catch((err) => {
        if (!isCancelled) setLoadError(err)
      })
    return () => {
      isCancelled = true
    }
  }, [attempt])

  const tiles = stats && [
    {
      key: 'compounds',
      Icon: Building2,
      value: stats.compounds,
      note: fill('owner.overview.activeOf', { active: stats.activeCompounds, total: stats.compounds }),
      to: '/owner/compounds',
    },
    { key: 'companies', Icon: Wrench, value: stats.companies, to: '/owner/companies' },
    { key: 'agreements', Icon: Handshake, value: stats.activeAgreements, to: '/owner/agreements' },
    {
      key: 'residents',
      Icon: Users,
      value: stats.residents,
      note: stats.pendingResidents ? fill('owner.overview.pending', { n: stats.pendingResidents }) : null,
    },
    { key: 'artisans', Icon: HardHat, value: stats.artisans },
    {
      key: 'requests',
      Icon: ClipboardList,
      value: stats.requests,
      note: fill('owner.overview.open', { n: stats.openRequests }),
    },
  ]

  return (
    <section className="ow">
      <PageHeader title={translate('owner.overview.title')} meta={translate('owner.overview.subtitle')} />

      {!stats && !loadError && <SkeletonList count={3} />}

      {loadError && (
        <ErrorState
          message={translate('owner.common.loadError')}
          onRetry={() => {
            setLoadError(null)
            setAttempt((count) => count + 1)
          }}
          retryLabel={translate('owner.common.retry')}
        />
      )}

      {stats && (
        <RevealGroup as="ul" className="ow-stats">
          {tiles.map(({ key, Icon, value, note, to }) => (
            <RevealItem as="li" key={key} className="ow-stat fx-card">
              <span className="ow-stat-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <p className="ow-stat-value">{value}</p>
              <p className="ow-stat-label">{translate(`owner.overview.${key}`)}</p>
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
      )}
    </section>
  )
}

export default OwnerDashboard
