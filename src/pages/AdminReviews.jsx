import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getReviewsOverview } from '../services/adminService'
import { toggleReviewVisibility } from '../services/requestsService'
import PeekRating from '../components/PeekRating'
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

  async function handleToggle(requestId) {
    setActioningId(requestId)
    const updated = await toggleReviewVisibility(requestId)
    setReviews((current) =>
      current.map((review) =>
        review.requestId === requestId
          ? { ...review, isHidden: updated.review.isHidden }
          : review,
      ),
    )
    setActioningId(null)
  }

  return (
    <section>
      <h1>{translate('adminReviews.title')}</h1>

      {isLoading && <p className="admin-reviews-status">{translate('adminReviews.loading')}</p>}

      {!isLoading && error && (
        <div className="admin-reviews-status">
          <p>{translate('adminReviews.error')}</p>
          <button type="button" className="admin-reviews-retry" onClick={handleRetry}>
            {translate('adminReviews.retry')}
          </button>
        </div>
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
                <p className="admin-review-title">{review.title}</p>
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
                onClick={() => handleToggle(review.requestId)}
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