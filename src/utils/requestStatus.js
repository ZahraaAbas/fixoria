export function statusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '_')
}

export const CANCELLABLE_STATUSES = ['open', 'accepted']