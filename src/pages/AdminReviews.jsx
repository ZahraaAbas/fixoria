import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Eye, EyeOff, MessageSquareQuote, Star, User, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { getReviewsOverview, setReviewVisibility } from '../services/adminService'
import PeekRating from '../components/PeekRating'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { RevealGroup, RevealItem } from '../components/ui/Reveal'
import { spring } from '../components/ui/motion'
import './AdminReviews.css'

function AdminReviews() {
  const reduceMotion = useReducedMotion()
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

  const hiddenCount = reviews.filter((review) => review.isHidden).length

  return (
    <section>
      <PageHeader
        title={translate('adminReviews.title')}
        meta={
          !isLoading && !error && reviews.length > 0 ? (
            <>
              <span className="arv-count">
                <Star size={14} aria-hidden="true" />
                {reviews.length}
              </span>
              {hiddenCount > 0 && (
                <span className="arv-count arv-count--hidden">
                  <EyeOff size={14} aria-hidden="true" />
                  {hiddenCount}
                </span>
              )}
            </>
          ) : null
        }
      />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('adminReviews.loading')}
          </p>
          <SkeletonList count={4} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminReviews.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminReviews.retry')}
        />
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <EmptyState icon={Star} title={translate('adminReviews.empty')} />
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <RevealGroup as="ul" className="arv-grid" gap={0.05}>
          {reviews.map((review) => {
            const isBusy = actioningId === review.requestId
            return (
              <RevealItem
                as="li"
                key={review.requestId}
                className={`arv-card fx-card ${review.isHidden ? 'is-hidden' : ''}`}
              >
                <div className="arv-head">
                  <div className="arv-head-text">
                    <p className="arv-title">{review.title || review.categoryName}</p>
                    <p className="arv-category">{review.categoryName}</p>
                  </div>
                  <span className="arv-score">
                    <Star size={13} aria-hidden="true" />
                    {review.rating}
                  </span>
                </div>

                <PeekRating value={review.rating} readOnly size={16} activeColor="#f19035" idleColor="#dac7c0" />

                <dl className="arv-people">
                  <div>
                    <dt>
                      <User size={13} aria-hidden="true" />
                      {translate('adminReviews.resident')}
                    </dt>
                    <dd>{review.residentName}</dd>
                  </div>
                  <div>
                    <dt>
                      <Wrench size={13} aria-hidden="true" />
                      {translate('adminReviews.artisan')}
                    </dt>
                    <dd>{review.artisanName}</dd>
                  </div>
                </dl>

                {review.comment && (
                  <p className="arv-comment">
                    <MessageSquareQuote size={15} aria-hidden="true" />
                    <span>{review.comment}</span>
                  </p>
                )}

                {review.isHidden && (
                  <p className="arv-hidden-notice">
                    <EyeOff size={15} aria-hidden="true" />
                    {translate('adminReviews.hiddenNotice')}
                  </p>
                )}

                <motion.button
                  type="button"
                  layout={!reduceMotion}
                  transition={spring}
                  className={`fx-btn fx-btn--sm ${review.isHidden ? 'fx-btn--dark' : 'fx-btn--secondary'} arv-toggle`}
                  onClick={() => handleToggle(review.requestId, review.isHidden)}
                  disabled={isBusy}
                >
                  {review.isHidden ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                  {translate(review.isHidden ? 'adminReviews.show' : 'adminReviews.hide')}
                </motion.button>
              </RevealItem>
            )
          })}
        </RevealGroup>
      )}
    </section>
  )
}

export default AdminReviews
