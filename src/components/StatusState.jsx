import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import './StatusState.css'

export function LoadingState({ message }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <span className="state-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <p className="state-message">{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry, retryLabel }) {
  return (
    <div className="state-block state-block-error" role="alert">
      <span className="state-icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button type="button" className="fx-btn fx-btn--secondary fx-btn--sm state-retry" onClick={onRetry}>
          <RotateCw size={15} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}

// حالة فراغ موحّدة: أيقونة + عنوان + وصف اختياري + إجراء اختياري
export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="state-block state-block-empty">
      <span className="state-empty-icon" aria-hidden="true">
        <Icon size={26} strokeWidth={1.75} />
      </span>
      {title && <p className="state-title">{title}</p>}
      {message && <p className="state-message">{message}</p>}
      {action && <div className="state-action">{action}</div>}
    </div>
  )
}

// هيكل تحميل لقوائم/شبكات البطاقات
export function SkeletonList({ count = 4, variant = 'row' }) {
  return (
    <div className={`state-skeleton state-skeleton--${variant}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="state-skeleton-item fx-card">
          <span className="fx-skeleton state-skeleton-avatar" />
          <span className="state-skeleton-lines">
            <span className="fx-skeleton" style={{ width: '62%' }} />
            <span className="fx-skeleton" style={{ width: '38%' }} />
          </span>
        </div>
      ))}
    </div>
  )
}
