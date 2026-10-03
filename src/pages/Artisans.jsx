import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Star, Users } from 'lucide-react'
import { translate } from '../i18n'
import { getArtisans } from '../services/artisansService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import TiltCard from '../components/ui/TiltCard'
import './Artisans.css'

function Artisans() {
  const [artisans, setArtisans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getArtisans()
      .then((data) => {
        if (!isCancelled) setArtisans(data)
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
    <section>
      <PageHeader
        eyebrow={translate('home.featuredEyebrow')}
        title={translate('artisans.title')}
        meta={
          !isLoading && !error && artisans.length > 0 ? (
            <span className="artisans-count">
              <Users size={15} aria-hidden="true" />
              {artisans.length}
            </span>
          ) : null
        }
      />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('artisans.loading')}
          </p>
          <SkeletonList count={6} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('artisans.error')}
          onRetry={handleRetry}
          retryLabel={translate('artisans.retry')}
        />
      )}

      {!isLoading && !error && artisans.length === 0 && (
        <EmptyState icon={Users} title={translate('artisans.empty')} />
      )}

      {!isLoading && !error && artisans.length > 0 && (
        <RevealGroup as="ul" className="artisan-grid" gap={0.06}>
          {artisans.map((artisan) => (
            <RevealItem as="li" key={artisan.id} className="artisan-grid-item">
              <TiltCard className="artisan-tilt" max={5}>
                <Link to={`/artisans/${artisan.id}`} className="artisan-tile">
                  <span className="artisan-tile-glow" aria-hidden="true" />
                  <div className="artisan-tile-head">
                    <span className="artisan-tile-avatar" aria-hidden="true">
                      {artisan.fullName?.charAt(0)}
                    </span>
                    <div className="artisan-tile-id">
                      <p className="artisan-tile-name">{artisan.fullName}</p>
                      {artisan.reviewsCount > 0 ? (
                        <p className="artisan-tile-rating">
                          <Star size={14} aria-hidden="true" />
                          <strong>{artisan.rating}</strong>
                          <span>
                            ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
                          </span>
                        </p>
                      ) : (
                        <p className="artisan-tile-rating artisan-tile-rating--empty">
                          {translate('artisans.noReviews')}
                        </p>
                      )}
                    </div>
                  </div>

                  {artisan.categoryNames.length > 0 && (
                    <ul className="artisan-tile-tags" aria-label={translate('artisanRegister.categories')}>
                      {artisan.categoryNames.map((name) => (
                        <li key={name} className="fx-badge fx-badge--plain">
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}

                  {artisan.bio && <p className="artisan-tile-bio">{artisan.bio}</p>}

                  <span className="artisan-tile-arrow" aria-hidden="true">
                    <ArrowLeft size={18} className="icon-forward" />
                  </span>
                </Link>
              </TiltCard>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </section>
  )
}

export default Artisans
