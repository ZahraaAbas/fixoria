import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { getCategoryById } from '../services/categoriesService'
import { getArtisansByService } from '../services/artisansService'
import './Artisans.css'
import './ServiceArtisans.css'

function initials(name) {
  return (name || '؟')
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
}

function Stars({ value }) {
  const rounded = Math.round(value || 0)
  return (
    <span className="service-artisan-stars" aria-hidden="true">
      {'★'.repeat(rounded)}
      <span className="service-artisan-stars-off">{'★'.repeat(5 - rounded)}</span>
    </span>
  )
}

// صفحة الخدمة: من يضغط الساكن على خدمة بـ "تصفح الخدمات" تطلعله بروفايلات حرفييها
function ServiceArtisans() {
  const { serviceId } = useParams()
  const [service, setService] = useState(null)
  const [artisans, setArtisans] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([getCategoryById(serviceId), getArtisansByService(serviceId)])
      .then(([serviceData, artisansData]) => {
        if (isCancelled) return
        setService(serviceData)
        setArtisans(artisansData)
      })
      .catch((err) => {
        if (!isCancelled) setError(err)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [serviceId, attempt])

  if (isLoading) {
    return <p className="artisans-status">{translate('serviceArtisans.loading')}</p>
  }

  if (error?.message === 'NOT_FOUND') {
    return (
      <div className="artisans-status">
        <p>{translate('serviceArtisans.notFound')}</p>
        <Link to="/home">{translate('serviceArtisans.backToServices')}</Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="artisans-status">
        <p>
          {translate(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'serviceArtisans.error')}
        </p>
        <button type="button" className="artisans-retry" onClick={() => setAttempt((n) => n + 1)}>
          {translate('serviceArtisans.retry')}
        </button>
      </div>
    )
  }

  return (
    <section>
      <Link to="/home" className="service-artisans-back">
        {translate('serviceArtisans.backToServices')}
      </Link>

      <header className="service-artisans-header">
        <div>
          <h1 className="service-artisans-title">{service.name}</h1>
          {service.description && <p className="service-artisans-desc">{service.description}</p>}
          <p className="service-artisans-count">
            {artisans.length} {translate('serviceArtisans.artisansCount')}
          </p>
        </div>
        <Link to={`/requests/new/${service.id}`} className="service-artisans-cta">
          {translate('serviceArtisans.requestService')}
        </Link>
      </header>

      {artisans.length === 0 ? (
        <p className="artisans-status">{translate('serviceArtisans.empty')}</p>
      ) : (
        <ul className="artisan-list">
          {artisans.map((artisan) => (
            <li key={artisan.id} className="artisan-card service-artisan-card">
              <Link to={`/artisans/${artisan.id}`} className="artisan-card-link">
                <div className="service-artisan-top">
                  {artisan.image ? (
                    <img src={artisan.image} alt="" className="service-artisan-avatar" />
                  ) : (
                    <span className="service-artisan-avatar" aria-hidden="true">
                      {initials(artisan.fullName)}
                    </span>
                  )}
                  <div>
                    <p className="artisan-name">{artisan.fullName}</p>
                    {artisan.location && <p className="artisan-category">{artisan.location}</p>}
                  </div>
                </div>

                <p className="artisan-rating">
                  {artisan.rating != null ? (
                    <>
                      <Stars value={artisan.rating} /> {artisan.rating} ({artisan.reviewsCount}{' '}
                      {translate('artisans.reviewsCount')})
                    </>
                  ) : (
                    <span className="service-artisan-norating">{translate('serviceArtisans.noRating')}</span>
                  )}
                </p>

                {artisan.bio && <p className="service-artisan-bio">{artisan.bio}</p>}

                <span className="service-artisan-more">{translate('serviceArtisans.viewProfile')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ServiceArtisans
