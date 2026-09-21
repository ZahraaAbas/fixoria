import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { getCategories } from '../services/categoriesService'
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
        <ul className="category-list">
          {categories.map((category) => (
            <li key={category.id} className="category-card">
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default Home