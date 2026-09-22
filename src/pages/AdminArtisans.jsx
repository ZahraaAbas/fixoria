import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getArtisanAccounts, approveArtisan, rejectArtisan } from '../services/adminService'
import { categories } from '../mocks/categories'
import './AdminArtisans.css'

function categoryNamesFor(categoryIds = []) {
  return categories
    .filter((category) => categoryIds.includes(category.id))
    .map((category) => category.name)
    .join('، ')
}

function AdminArtisans() {
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)

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

  async function handleApprove(id) {
    setActioningId(id)
    const updated = await approveArtisan(id)
    setAccounts((current) => current.map((account) => (account.id === id ? updated : account)))
    setActioningId(null)
  }

  async function handleReject(id) {
    setActioningId(id)
    const updated = await rejectArtisan(id)
    setAccounts((current) => current.map((account) => (account.id === id ? updated : account)))
    setActioningId(null)
  }

  const pending = accounts.filter((account) => account.status === 'pending')
  const others = accounts.filter((account) => account.status !== 'pending')

  return (
    <section>
      <h1>{translate('adminArtisans.title')}</h1>

      {isLoading && <p className="admin-status">{translate('adminArtisans.loading')}</p>}

      {!isLoading && error && (
        <div className="admin-status">
          <p>{translate('adminArtisans.error')}</p>
          <button type="button" className="admin-retry" onClick={handleRetry}>
            {translate('adminArtisans.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <h2 className="admin-section-title">{translate('adminArtisans.pendingTitle')}</h2>

          {pending.length === 0 && (
            <p className="admin-status">{translate('adminArtisans.noPending')}</p>
          )}

          {pending.length > 0 && (
            <ul className="admin-artisan-list">
              {pending.map((account) => (
                <li key={account.id} className="admin-artisan-card">
                  <div>
                    <p className="admin-artisan-name">{account.fullName}</p>
                    <p className="admin-artisan-meta">
                      {account.email} · {account.phone}
                    </p>
                    <p className="admin-artisan-meta">{categoryNamesFor(account.categoryIds)}</p>
                    <p className="admin-artisan-bio">{account.bio}</p>
                  </div>
                  <div className="admin-artisan-actions">
                    <button
                      type="button"
                      className="admin-approve-button"
                      onClick={() => handleApprove(account.id)}
                      disabled={actioningId === account.id}
                    >
                      {translate('adminArtisans.approve')}
                    </button>
                    <button
                      type="button"
                      className="admin-reject-button"
                      onClick={() => handleReject(account.id)}
                      disabled={actioningId === account.id}
                    >
                      {translate('adminArtisans.reject')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="admin-section-title">{translate('adminArtisans.othersTitle')}</h2>

          {others.length === 0 && (
            <p className="admin-status">{translate('adminArtisans.noOthers')}</p>
          )}

          {others.length > 0 && (
            <ul className="admin-artisan-list">
              {others.map((account) => (
                <li key={account.id} className="admin-artisan-card admin-artisan-card-readonly">
                  <div>
                    <p className="admin-artisan-name">{account.fullName}</p>
                    <p className="admin-artisan-meta">{account.email}</p>
                  </div>
                  <span className={`admin-status-badge admin-status-${account.status}`}>
                    {translate(`adminArtisans.status.${account.status}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default AdminArtisans