import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getReviewsForArtisan } from '../services/requestsService'
import PeekRating from '../components/PeekRating'
import { LoadingState, ErrorState } from '../components/StatusState'
import './ArtisanReviews.css'

function average(numbers) {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((total, value) => total + value, 0)
  return Math.round((sum / numbers.length) * 10) / 10
}

function ArtisanReviews() {
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getReviewsForArtisan()
      .then((data) => {
        if (!isCancelled) setReviews(data)
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

  const averageRating = average(reviews.map((review) => review.rating))

  return (
    <section>
      <h1>{translate('artisanReviews.title')}</h1>

      {isLoading && <LoadingState message={translate('artisanReviews.loading')} />}

      {!isLoading && error && (
        <ErrorState
          message={translate('artisanReviews.error')}
          onRetry={handleRetry}
          retryLabel={translate('artisanReviews.retry')}
        />
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <p className="artisan-reviews-status">{translate('artisanReviews.empty')}</p>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <>
          <div className="artisan-reviews-summary">
            <span className="artisan-reviews-average">{averageRating}</span>
            <div>
              <PeekRating value={Math.round(averageRating)} readOnly size={22} activeColor="#f19035" idleColor="#dac7c0" />
              <p className="artisan-reviews-count">
                {reviews.length} {translate('artisanReviews.count')}
              </p>
            </div>
          </div>

          <ul className="artisan-reviews-list">
            {reviews.map((review) => (
              <li key={review.requestId} className="artisan-review-card">
                <div className="artisan-review-header">
                  <p className="artisan-review-title">{review.title || review.categoryName}</p>
                  <PeekRating value={review.rating} readOnly size={18} activeColor="#f19035" idleColor="#dac7c0" />
                </div>
                <p className="artisan-review-category">{review.categoryName}</p>
                {review.comment && <p className="artisan-review-comment">{review.comment}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default ArtisanReviews