import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MessageSquareQuote, Star } from 'lucide-react'
import { translate } from '../i18n'
import { getReviewsForArtisan } from '../services/requestsService'
import PeekRating from '../components/PeekRating'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import CountUp from '../components/ui/CountUp'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import { easeOut } from '../components/ui/motion'
import './ArtisanReviews.css'

function average(numbers) {
  if (numbers.length === 0) return 0
  const sum = numbers.reduce((total, value) => total + value, 0)
  return Math.round((sum / numbers.length) * 10) / 10
}

function ArtisanReviews() {
  const reduceMotion = useReducedMotion()
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
  // توزيع التقييمات من 5 إلى 1 (محسوب من نفس البيانات)
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => Math.round(review.rating) === stars).length
    return { stars, count, share: reviews.length ? count / reviews.length : 0 }
  })

  return (
    <section className="rv">
      <PageHeader title={translate('artisanReviews.title')} />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('artisanReviews.loading')}
          </p>
          <SkeletonList count={4} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('artisanReviews.error')}
          onRetry={handleRetry}
          retryLabel={translate('artisanReviews.retry')}
        />
      )}

      {!isLoading && !error && reviews.length === 0 && (
        <EmptyState icon={Star} title={translate('artisanReviews.empty')} />
      )}

      {!isLoading && !error && reviews.length > 0 && (
        <div className="rv-layout">
          <Reveal as="aside" className="rv-summary fx-surface-depth">
            <p className="rv-summary-label">{translate('artisanReviews.average')}</p>
            <p className="rv-average">
              <CountUp value={averageRating} decimals={1} />
            </p>
            <PeekRating
              value={Math.round(averageRating)}
              readOnly
              size={22}
              activeColor="#f19035"
              idleColor="rgba(253, 243, 238, 0.22)"
            />
            <p className="rv-count">
              {reviews.length} {translate('artisanReviews.count')}
            </p>

            <ul className="rv-bars" aria-hidden="true">
              {distribution.map(({ stars, count, share }, index) => (
                <li key={stars}>
                  <span className="rv-bar-label">
                    {stars}
                    <Star size={11} />
                  </span>
                  <span className="rv-bar-track">
                    <motion.span
                      className="rv-bar-fill"
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      animate={{ scaleX: share }}
                      transition={{ duration: 0.9, ease: easeOut, delay: 0.3 + index * 0.08 }}
                    />
                  </span>
                  <span className="rv-bar-count">{count}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <RevealGroup as="ul" className="rv-list" gap={0.06}>
            {reviews.map((review) => (
              <RevealItem as="li" key={review.requestId} className="rv-card fx-card">
                <div className="rv-card-head">
                  <div>
                    <p className="rv-card-title">{review.title || review.categoryName}</p>
                    <p className="rv-card-category">{review.categoryName}</p>
                  </div>
                  <span className="rv-card-score">
                    <Star size={14} aria-hidden="true" />
                    {review.rating}
                  </span>
                </div>
                <PeekRating value={review.rating} readOnly size={16} activeColor="#f19035" idleColor="#dac7c0" />
                {review.comment && (
                  <p className="rv-card-comment">
                    <MessageSquareQuote size={16} aria-hidden="true" />
                    <span>{review.comment}</span>
                  </p>
                )}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </section>
  )
}

export default ArtisanReviews
