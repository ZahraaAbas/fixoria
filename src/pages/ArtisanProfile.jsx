import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { MessageSquareQuote, UserX } from 'lucide-react'
import { translate } from '../i18n'
import { getArtisanById } from '../services/artisansService'
import { mediaUrl } from '../services/apiClient'
import PeekRating from '../components/PeekRating'
import { ErrorState, EmptyState } from '../components/StatusState'
import { BackLink } from '../components/ui/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import { easeOut } from '../components/ui/motion'
import './ArtisanProfile.css'

function ProfileSkeleton() {
  return (
    <div className="ap-skeleton" aria-hidden="true">
      <span className="fx-skeleton ap-skeleton-hero" />
      <span className="fx-skeleton ap-skeleton-line" />
      <span className="fx-skeleton ap-skeleton-line ap-skeleton-line--short" />
    </div>
  )
}

function ArtisanProfile() {
  const { id } = useParams()
  const reduceMotion = useReducedMotion()
  const [artisan, setArtisan] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const requestKey = `${id}-${attempt}`
  const [loadedFor, setLoadedFor] = useState(requestKey)
  if (loadedFor !== requestKey) {
    setLoadedFor(requestKey)
    setIsLoading(true)
    setError(null)
  }

  useEffect(() => {
    let isCancelled = false

    getArtisanById(id)
      .then((data) => {
        if (!isCancelled) setArtisan(data)
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
  }, [id, attempt])

  function handleRetry() {
    setAttempt((count) => count + 1)
  }

  const back = <BackLink to="/artisans">{translate('artisanProfile.backToList')}</BackLink>

  if (isLoading) {
    return (
      <article className="ap">
        {back}
        <p className="sr-only" role="status">
          {translate('artisanProfile.loading')}
        </p>
        <ProfileSkeleton />
      </article>
    )
  }

  if (error?.message === 'NOT_FOUND') {
    return (
      <EmptyState
        icon={UserX}
        title={translate('artisanProfile.notFound')}
        action={
          <Link to="/artisans" className="fx-btn fx-btn--secondary">
            {translate('artisanProfile.backToList')}
          </Link>
        }
      />
    )
  }

  if (error) {
    return (
      <ErrorState
        message={translate('artisanProfile.error')}
        onRetry={handleRetry}
        retryLabel={translate('artisanProfile.retry')}
      />
    )
  }

  return (
    <article className="ap">
      {back}

      <motion.header
        className="ap-hero fx-surface-depth"
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: easeOut }}
      >
        <span className="ap-hero-grid" aria-hidden="true" />
        <motion.span
          className="ap-avatar fx-avatar"
          aria-hidden="true"
          initial={reduceMotion ? false : { scale: 0.6, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.2 }}
        >
          {artisan.avatar ? <img src={mediaUrl(artisan.avatar)} alt="" /> : artisan.fullName?.charAt(0)}
        </motion.span>

        <div className="ap-identity">
          <h1 className="ap-name">{artisan.fullName}</h1>

          {artisan.reviewsCount > 0 ? (
            <div className="ap-rating">
              <PeekRating
                value={Math.round(artisan.rating)}
                readOnly
                size={20}
                activeColor="#f19035"
                idleColor="rgba(253, 243, 238, 0.25)"
              />
              <span>
                <strong>{artisan.rating}</strong> ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
              </span>
            </div>
          ) : (
            <p className="ap-rating ap-rating--empty">{translate('artisans.noReviews')}</p>
          )}
        </div>
      </motion.header>

      <div className="ap-body">
        {artisan.categoryNames.length > 0 && (
          <Reveal as="section" className="ap-card fx-card">
            <h2 className="ap-card-title">{translate('artisanProfile.services')}</h2>
            <ul className="ap-tags">
              {artisan.categoryNames.map((name) => (
                <li key={name} className="ap-tag">
                  {name}
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        {artisan.bio && (
          <Reveal as="section" className="ap-card fx-card ap-card--bio" delay={0.1}>
            <h2 className="ap-card-title">
              <MessageSquareQuote size={18} aria-hidden="true" />
              {translate('artisanProfile.about')}
            </h2>
            <p className="ap-bio">{artisan.bio}</p>
          </Reveal>
        )}
      </div>
    </article>
  )
}

export default ArtisanProfile
