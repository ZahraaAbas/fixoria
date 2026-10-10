import { useEffect, useState } from 'react'
import { Mail, Phone, Users } from 'lucide-react'
import { translate } from '../i18n'
import { getArtisanAccounts } from '../services/adminService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import Avatar from '../components/ui/Avatar'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import './AdminArtisans.css'

// حرفيو الشركات المتفقة ويه المجمع — للاطلاع، والشركات هي اللي تضيفهم وتوقفهم
function AdminArtisans() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getArtisanAccounts()
      .then((data) => {
        if (!isCancelled) setAccounts(data)
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

  return (
    <section className="aa">
      <PageHeader title={translate('adminArtisans.title')} meta={translate('adminArtisans.subtitle')} />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('adminArtisans.loading')}
          </p>
          <SkeletonList count={4} />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminArtisans.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminArtisans.retry')}
        />
      )}

      {!isLoading && !error && accounts.length === 0 && (
        <EmptyState icon={Users} title={translate('adminArtisans.noOthers')} message={translate('adminArtisans.emptyHint')} />
      )}

      {!isLoading && !error && accounts.length > 0 && (
        <RevealGroup as="ul" className="aa-table fx-card" gap={0.03}>
          {accounts.map((account) => (
            <RevealItem as="li" key={account.id} className="aa-row">
              <Avatar src={account.avatar} name={account.fullName} className="aa-avatar aa-avatar--sm" />
              <div className="aa-row-id">
                <p className="aa-name">{account.fullName}</p>
                <p className="aa-row-email" dir="ltr">
                  <Mail size={12} aria-hidden="true" /> {account.email}
                  {account.phone && (
                    <>
                      {' · '}
                      <Phone size={12} aria-hidden="true" /> {account.phone}
                    </>
                  )}
                </p>
                {account.categoryNames?.length > 0 && <p className="aa-row-email">{account.categoryNames.join(translate('common.comma'))}</p>}
              </div>
              <span className={`fx-badge ${account.status === 'approved' ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
                {translate(account.status === 'approved' ? 'owner.common.active' : 'owner.common.inactive')}
              </span>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  )
}

export default AdminArtisans
