import { Star } from 'lucide-react'

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          onClick={() => onChange(star)}
          className="rounded p-0.5"
        >
          <Star
            size={28}
            fill={star <= value ? '#f19035' : 'none'}
            color={star <= value ? '#f19035' : '#c9bdb8'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

export default StarRating