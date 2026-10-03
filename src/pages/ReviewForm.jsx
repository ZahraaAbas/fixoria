import { useState } from 'react'
import { AlertCircle, Sparkles } from 'lucide-react'
import { translate } from '../i18n'
import { submitResidentReview } from '../services/requestsService'
import PeekRating from '../components/PeekRating'
import { Reveal } from '../components/ui/Reveal'
import './ReviewForm.css'

const RATING_KEYS = ['review.rating1', 'review.rating2', 'review.rating3', 'review.rating4', 'review.rating5']

function ReviewForm({ requestId, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (rating === 0) {
      setError('review.required')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const review = await submitResidentReview({ requestId, rating, comment })
      onSubmitted(review)
    } catch {
      setError('review.submitError')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Reveal as="form" className="review-card fx-card fx-card--featured" onSubmit={handleSubmit}>
      <span className="review-card-glow" aria-hidden="true" />
      <div className="review-card-head">
        <span className="review-card-icon" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <p className="review-card-title">{translate('review.title')}</p>
      </div>

      <div className="review-rating">
        <span className="fx-label">{translate('review.ratingLabel')}</span>
        <PeekRating
          value={rating}
          onChange={setRating}
          labels={RATING_KEYS.map((key) => translate(key))}
          activeColor="#f19035"
          idleColor="#dac7c0"
          tipColor="#263056"
          tipTextColor="#ffffff"
          size={36}
          ariaLabel={translate('review.ratingLabel')}
        />
      </div>

      {error && (
        <p className="fx-notice fx-notice--danger" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          {translate(error)}
        </p>
      )}

      <label className="fx-field">
        <span className="fx-label">{translate('review.commentLabel')}</span>
        <textarea
          className="fx-input"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
        />
      </label>

      <button type="submit" className="fx-btn fx-btn--primary" disabled={isSubmitting}>
        {translate(isSubmitting ? 'review.submitting' : 'review.submit')}
      </button>
    </Reveal>
  )
}

export default ReviewForm
