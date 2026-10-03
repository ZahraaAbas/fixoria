export function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '_')
}

export const CANCELLABLE_STATUSES = ['pending', 'accepted']

// لون العرض لكل حالة (يطابق كلاسات fx-badge--* في ui.css)
const STATUS_TONE = {
  open: 'open',
  pending: 'pending',
  accepted: 'accepted',
  in_progress: 'progress',
  completed: 'completed',
  cancelled: 'cancelled',
  rejected: 'rejected',
}

export function statusTone(status) {
  return STATUS_TONE[statusKey(status)] || 'cancelled'
}
