import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getCategories } from '../services/categoriesService'
import { serviceVisuals } from '../config/serviceVisuals'
import ServiceCard from '../components/ServiceCard'
import './Home.css'

function Home() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false

    getCategories()
      .then((data) => {
        if (!isCancelled) setCategories(data)
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
  }, [attempt])

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setAttempt((count) => count + 1)
  }

  return (
    <section className="home-page-wrapper">
      <div className="home-content">
        <h1>{translate('home.title')}</h1>

        {isLoading && <p className="home-status">{translate('home.loading')}</p>}

        {!isLoading && error && (
          <div className="home-status">
            <p>{translate('home.error')}</p>
            <button type="button" className="home-retry" onClick={handleRetry}>
              {translate('home.retry')}
            </button>
          </div>
        )}

        {!isLoading && !error && categories.length === 0 && (
          <p className="home-status">{translate('home.empty')}</p>
        )}

        {!isLoading && !error && categories.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <ServiceCard
                key={category.id}
                to={`/requests/new/${category.id}`}
                title={category.name}
                Icon={serviceVisuals[category.id]?.Icon}
                gradient={serviceVisuals[category.id]?.gradient}
                delay={index * 0.08}
              />
            ))}
          </div>
        )}
      </div>

      {/* الفوتر المدمج مباشرة لمنع أي أخطاء في الاستيراد */}
      <footer style={{
        marginTop: '60px',
        padding: '24px',
        background: '#263056',
        color: '#fdf3ee',
        textAlign: 'center',
        borderRadius: '16px 16px 0 0',
        fontSize: '0.9rem'
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: '700' }}>Fixoria — منصة صيانة مجمع البدور السكني</p>
        <p style={{ margin: 0, opacity: 0.75, fontSize: '0.8rem' }}>جميع الحقوق محفوظة © 2026</p>
      </footer>
    </section>
  )
}

export default Home