import { AlertTriangle } from 'lucide-react'
import './StatusState.css'

export function LoadingState({ message }) {
  return (
    <div className="state-block">
      <span className="state-spinner" aria-hidden="true" />
      <p className="state-message">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry, retryLabel }) {
  return (
    <div className="state-block state-block-error">
      <span className="state-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button type="button" className="state-retry" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  )
}
