import { mediaUrl } from '../../services/apiClient'
import './MediaGallery.css'

// صور مرفقة بالطلب: مصغّرات، والضغط يفتح الصورة كاملة في تبويب جديد
function MediaGallery({ images = [], label, size = 'md' }) {
  if (images.length === 0) return null

  return (
    <ul className={`media-gallery media-gallery--${size}`} aria-label={label}>
      {images.map((path, index) => {
        const url = mediaUrl(path)
        return (
          <li key={path}>
            <a href={url} target="_blank" rel="noreferrer" className="media-gallery-link">
              <img src={url} alt={`${label} ${index + 1}`} loading="lazy" decoding="async" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export default MediaGallery
