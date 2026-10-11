import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, MessageSquareQuote, Star, X } from 'lucide-react'
import { translate } from '../i18n'
import { getReviewsForArtisan } from '../services/requestsService'
import { formatDate, parseApiDate } from '../utils/formatDate'
import '../components/dashboard/Dashboard.css'
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
  // فلتر النجوم بالرابط (?stars=5) — الضغط على شريط التوزيع يفلتر القائمة
  const [params, setParams] = useSearchParams()
  const starsFilter = Number(params.get('stars')) || 0

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

  const shown = reviews
    .filter((review) => !starsFilter || Math.round(review.rating) === starsFilter)
    .sort((a, b) => (b.createdAt ? parseApiDate(b.createdAt) : 0) - (a.createdAt ? parseApiDate(a.createdAt) : 0))

  function setStars(stars) {
    setParams(stars && stars !== starsFilter ? { stars: String(stars) } : {}, { replace: true })
  }

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

            <ul className="rv-bars" aria-label={translate('artisanWorkspace.reviewsFilter')}>
              {distribution.map(({ stars, count, share }, index) => (
                <li key={stars}>
                  <button
                    type="button"
                    className={`rv-bar-button ${starsFilter === stars ? 'is-active' : ''}`}
                    aria-pressed={starsFilter === stars}
                    disabled={count === 0}
                    onClick={() => setStars(stars)}
                  >
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
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="rv-main">
          {starsFilter > 0 && (
            <div className="fchips">
              <span className="fchip">{translate('artisanWorkspace.starsChip').replace('{n}', starsFilter)}</span>
              <button type="button" className="fchip-clear" onClick={() => setStars(0)}>
                <X size={14} aria-hidden="true" />
                {translate('analytics.chips.clear')}
              </button>
            </div>
          )}
          {/* المفتاح يتغير مع الفلتر حتى العناصر الجديدة تظهر بحركتها */}
          <RevealGroup key={starsFilter} as="ul" className="rv-list" gap={0.06}>
            {shown.map((review) => (
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
                <p className="rv-card-foot">
                  {review.createdAt && <span>{formatDate(review.createdAt)}</span>}
                  {review.requestId && (
                    <Link to={`/artisan/my-work?stage=completed&open=${review.requestId}`} className="rv-card-link">
                      {translate('artisanWorkspace.viewJob').replace('{id}', review.requestId)}
                      <ArrowLeft size={13} aria-hidden="true" className="icon-forward" />
                    </Link>
                  )}
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
          </div>
        </div>
      )}
    </section>
  )
}

export default ArtisanReviews
