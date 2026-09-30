import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getReviewsOverview, setReviewVisibility } from '../services/adminService'
import PeekRating from '../components/PeekRating'
import { LoadingState, ErrorState } from '../components/StatusState'
import './AdminReviews.css'

function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    let isCancelled = false

    getReviewsOverview()
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

  async function handleToggle(requestId, currentlyHidden) {
    setActioningId(requestId)
    const updated = await setReviewVisibility(requestId, !currentlyHidden)
    setReviews((current) =>
      current.map((review) => (review.requestId === requestId ? updated : review)),
    )
    setActioningId(null)
  }

  return (
    <section>
      <h1>{translate('adminReviews.title')}</h1>

      {isLoading && <LoadingState message={translate('adminReviews.loading')} />}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminReviews.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminReviews.retry')}
        />
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <p className="admin-reviews-status">{translate('adminReviews.empty')}</p>
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <ul className="admin-reviews-list">
          {reviews.map((review) => (
            <li
              key={review.requestId}
              className={
                review.isHidden
                  ? 'admin-review-card admin-review-card-hidden'
                  : 'admin-review-card'
              }
            >
              <div className="admin-review-header">
                <p className="admin-review-title">{review.title || review.categoryName}</p>
                <PeekRating value={review.rating} readOnly size={18} activeColor="#f19035" idleColor="#dac7c0" />
              </div>
              <p className="admin-review-meta">
                {translate('adminReviews.resident')}: {review.residentName} ·{' '}
                {translate('adminReviews.artisan')}: {review.artisanName}
              </p>
              <p className="admin-review-meta">{review.categoryName}</p>
              {review.comment && <p className="admin-review-comment">{review.comment}</p>}

              {review.isHidden && (
                <p className="admin-review-hidden-notice">
                  {translate('adminReviews.hiddenNotice')}
                </p>
              )}

              <button
                type="button"
                className={
                  review.isHidden ? 'admin-review-show-button' : 'admin-review-hide-button'
                }
                onClick={() => handleToggle(review.requestId, review.isHidden)}
                disabled={actioningId === review.requestId}
              >
                {translate(review.isHidden ? 'adminReviews.show' : 'adminReviews.hide')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminReviews