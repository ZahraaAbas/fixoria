import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { getArtisanById } from '../services/artisansService'
import './ArtisanProfile.css'

function ArtisanProfile() {
  const { id } = useParams()
  const [artisan, setArtisan] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setError(null)

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

      <h1 className="artisan-profile-name">{artisan.fullName}</h1>
      <p className="artisan-profile-category">{artisan.categoryName}</p>
      <p className="artisan-profile-rating">
        ⭐ {artisan.rating} ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
      </p>
      <p className="artisan-profile-bio">{artisan.bio}</p>
    </article>
  )
}

export default ArtisanProfile