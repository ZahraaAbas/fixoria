import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getArtisans } from '../services/artisansService'
import './Artisans.css'
import { Link } from 'react-router'

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
      <h1>{translate('artisans.title')}</h1>

      {isLoading && <p className="artisans-status">{translate('artisans.loading')}</p>}

      {!isLoading && error && (
        <div className="artisans-status">
          <p>{translate('artisans.error')}</p>
          <button type="button" className="artisans-retry" onClick={handleRetry}>
            {translate('artisans.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && artisans.length === 0 && (
        <p className="artisans-status">{translate('artisans.empty')}</p>
      )}

      {!isLoading && !error && artisans.length > 0 && (
        <ul className="artisan-list">
          {artisans.map((artisan) => (
                       <li key={artisan.id} className="artisan-card">
              <Link to={`/artisans/${artisan.id}`} className="artisan-card-link">
                               <p className="artisan-category">{artisan.categoryNames.join('، ')}</p>
                {artisan.reviewsCount > 0 ? (
                  <p className="artisan-rating">
                    ⭐ {artisan.rating} ({artisan.reviewsCount} {translate('artisans.reviewsCount')})
                  </p>
                ) : (
                  <p className="artisan-rating">{translate('artisans.noReviews')}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Artisans