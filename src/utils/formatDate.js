export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
