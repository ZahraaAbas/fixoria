import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Hourglass, Mail, Phone, UserCheck, Users, X } from 'lucide-react'
import { translate } from '../i18n'
import { getArtisanAccounts, approveArtisan, rejectArtisan } from '../services/adminService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import { easeOut } from '../components/ui/motion'
import ActionError from '../components/ui/ActionError'
import './AdminArtisans.css'

const ACCOUNT_TONE = { approved: 'completed', rejected: 'rejected', pending: 'pending' }

function AdminArtisans() {
  const reduceMotion = useReducedMotion()
  const [accounts, setAccounts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)
  const [actionError, setActionError] = useState('')

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

  async function runDecision(id, action) {
    setActioningId(id)
    setActionError('')
    try {
      const updated = await action(id)
      setAccounts((current) => current.map((account) => (account.id === id ? updated : account)))
    } catch {
      setActionError('common.actionError')
    } finally {
      setActioningId(null)
    }
  }

  function handleApprove(id) {
    return runDecision(id, approveArtisan)
  }

  function handleReject(id) {
    return runDecision(id, rejectArtisan)
  }

  const pending = accounts.filter((account) => account.status === 'pending')
  const others = accounts.filter((account) => account.status !== 'pending')

  return (
    <section className="aa">
      <PageHeader title={translate('adminArtisans.title')} />
      <ActionError messageKey={actionError} className="aa-error" />

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

      {!isLoading && !error && (
        <>
          <section className="aa-section" aria-labelledby="aa-pending-title">
            <h2 id="aa-pending-title" className="aa-section-title">
              <Hourglass size={18} aria-hidden="true" />
              {translate('adminArtisans.pendingTitle')}
              {pending.length > 0 && <span className="aa-section-count aa-section-count--hot">{pending.length}</span>}
            </h2>

            {pending.length === 0 && (
              <EmptyState icon={UserCheck} title={translate('adminArtisans.noPending')} />
            )}

            {pending.length > 0 && (
              <ul className="aa-pending">
                <AnimatePresence initial={false} mode="popLayout">
                  {pending.map((account) => {
                    const isBusy = actioningId === account.id
                    return (
                      <motion.li
                        key={account.id}
                        layout={!reduceMotion}
                        className="aa-pending-card fx-card fx-card--featured"
                        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94, transition: { duration: 0.25, ease: easeOut } }}
                      >
                        <div className="aa-pending-head">
                          <span className="aa-avatar" aria-hidden="true">
                            {account.fullName?.trim().charAt(0)}
                          </span>
                          <div className="aa-pending-id">
                            <p className="aa-name">{account.fullName}</p>
                            <p className="aa-contact">
                              <span dir="ltr">
                                <Mail size={13} aria-hidden="true" />
                                {account.email}
                              </span>
                              {account.phone && (
                                <span dir="ltr">
                                  <Phone size={13} aria-hidden="true" />
                                  {account.phone}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {account.categoryNames?.length > 0 && (
                          <ul className="aa-tags">
                            {account.categoryNames.map((name) => (
                              <li key={name} className="fx-badge fx-badge--navy fx-badge--plain">
                                {name}
                              </li>
                            ))}
                          </ul>
                        )}

                        {account.bio && <p className="aa-bio">{account.bio}</p>}

                        <div className="aa-actions">
                          <button
                            type="button"
                            className="fx-btn fx-btn--primary"
                            onClick={() => handleApprove(account.id)}
                            disabled={isBusy}
                          >
                            <Check size={16} aria-hidden="true" />
                            {translate('adminArtisans.approve')}
                          </button>
                          <button
                            type="button"
                            className="fx-btn fx-btn--danger"
                            onClick={() => handleReject(account.id)}
                            disabled={isBusy}
                          >
                            <X size={16} aria-hidden="true" />
                            {translate('adminArtisans.reject')}
                          </button>
                        </div>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </section>

          <section className="aa-section" aria-labelledby="aa-others-title">
            <h2 id="aa-others-title" className="aa-section-title">
              <Users size={18} aria-hidden="true" />
              {translate('adminArtisans.othersTitle')}
              {others.length > 0 && <span className="aa-section-count">{others.length}</span>}
            </h2>

            {others.length === 0 && <EmptyState icon={Users} title={translate('adminArtisans.noOthers')} />}

            {others.length > 0 && (
              <RevealGroup as="ul" className="aa-table fx-card" gap={0.03}>
                {others.map((account) => (
                  <RevealItem as="li" key={account.id} className="aa-row">
                    <span className="aa-avatar aa-avatar--sm" aria-hidden="true">
                      {account.fullName?.trim().charAt(0)}
                    </span>
                    <div className="aa-row-id">
                      <p className="aa-name">{account.fullName}</p>
                      <p className="aa-row-email" dir="ltr">
                        {account.email}
                      </p>
                    </div>
                    <span className={`fx-badge fx-badge--${ACCOUNT_TONE[account.status] || 'cancelled'}`}>
                      {translate(`adminArtisans.status.${account.status}`)}
                    </span>
                  </RevealItem>
                ))}
              </RevealGroup>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default AdminArtisans
