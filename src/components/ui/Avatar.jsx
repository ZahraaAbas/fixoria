import { useState } from 'react'
import { mediaUrl } from '../../services/apiClient'

// صورة المستخدم إن وُجدت، وإلا الحرف الأول من الاسم. className يحدد الشكل والحجم.
function Avatar({ src, name, className = '', alt = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const url = mediaUrl(src)
  const initial = (name || '').trim().charAt(0) || '?'

  if (url && failedSrc !== url) {
    return (
      <span className={`fx-avatar ${className}`}>
        <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc(url)} />
      </span>
    )
  }

  return (
    <span className={`fx-avatar ${className}`} aria-hidden={alt ? undefined : 'true'}>
      {initial}
    </span>
  )
}

export default Avatar
