import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { getArtisanById } from '../services/artisansService'
import PeekRating from '../components/PeekRating'
import './ArtisanProfile.css'

function ArtisanProfile() {
  const { id } = useParams()
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

  if (isLoading) {
    return <p className="artisan-profile-status">{translate('artisanProfile.loading')}</p>
  }

  if (error?.message === 'NOT_FOUND') {
    return (
      <div className="artisan-profile-status">
        <p>{translate('artisanProfile.notFound')}</p>
        <Link to="/artisans">{translate('artisanProfile.backToList')}</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="artisan-profile-status">
        <p>{translate('artisanProfile.error')}</p>
        <button type="button" className="artisan-profile-retry" onClick={handleRetry}>
          {translate('artisanProfile.retry')}
        </button>
      </div>
    )
  }

  return (
    <article className="artisan-profile">
      <Link to="/artisans" className="artisan-profile-back">
        {translate('artisanProfile.backToList')}
      </Link>

      <div className="artisan-profile-card">
        <div className="artisan-profile-header">
          <span className="artisan-profile-avatar" aria-hidden="true">
            {artisan.fullName?.charAt(0)}
          </span>
          <div>
            <h1 className="artisan-profile-name">{artisan.fullName}</h1>
            <p className="artisan-profile-category">{artisan.categoryNames.join('، ')}</p>
          </div>
        </div>

        {artisan.reviewsCount > 0 ? (
          <div className="artisan-profile-rating">
            <PeekRating value={Math.round(artisan.rating)} readOnly size={20} activeColor="#f19035" idleColor="#dac7c0" />
            <span>
              {artisan.rating} ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
            </span>
          </div>
        ) : (
          <p className="artisan-profile-rating artisan-profile-rating-empty">
            {translate('artisans.noReviews')}
          </p>
        )}

        {artisan.bio && <p className="artisan-profile-bio">{artisan.bio}</p>}
      </div>
    </article>
  )
}

export default ArtisanProfile