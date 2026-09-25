import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getCategories } from '../services/categoriesService'
import { serviceImages, defaultServiceImage } from '../config/serviceImages'
import { serviceVisuals, defaultServiceVisual } from '../config/serviceVisuals'
import AccordionGallery from '../components/AccordionGallery'
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

  const galleryItems = categories.map((category) => {
    const Icon = (serviceVisuals[category.icon] || defaultServiceVisual).Icon
    return {
      image: serviceImages[category.icon] || defaultServiceImage,
      label: category.name,
      link: `/requests/new/${category.id}`,
      icon: <Icon size={20} />,
    }
  })

  return (
    <section>
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
        <div className="home-gallery-wrapper">
          <AccordionGallery
            items={galleryItems}
            defaultIndex={0}
            accentColor="#f19035"
            overlayColor="#263056"
            textColor="#ffffff"
            height={420}
            gap={10}
            radius={20}
            expandRatio={0.42}
            trigger="hover"
          />
        </div>
      )}
    </section>
  )
}

export default Home
