import { useState } from 'react'
import { translate } from '../i18n'
import { submitReview } from '../services/requestsService'
import StarRating from '../components/StarRating'
import './ReviewForm.css'

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
    const updated = await submitReview(requestId, { rating, comment })
    setIsSubmitting(false)
    onSubmitted(updated)
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <p className="review-form-title">{translate('review.title')}</p>

      <div className="review-field">
        <span>{translate('review.ratingLabel')}</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      {error && (
        <span className="review-error" role="alert">
          {translate(error)}
        </span>
      )}

      <label className="review-field">
        <span>{translate('review.commentLabel')}</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
        />
      </label>

      <button type="submit" className="review-submit" disabled={isSubmitting}>
        {translate(isSubmitting ? 'review.submitting' : 'review.submit')}
      </button>
    </form>
  )
}

export default ReviewForm