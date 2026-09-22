import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { translate } from '../i18n'
import { registerArtisan } from '../services/authService'
import { getCategories } from '../services/categoriesService'
import { validateArtisanRegister } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import './ArtisanRegister.css'

function ArtisanRegister() {
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    bio: '',
  })
  const [categoryIds, setCategoryIds] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    let isCancelled = false
    getCategories().then((data) => {
      if (!isCancelled) setCategories(data)
    })
    return () => {
      isCancelled = true
    }
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  function toggleCategory(categoryId) {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
    setErrors((current) => ({ ...current, categoryIds: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const values = { ...formData, categoryIds }
    const validationErrors = validateArtisanRegister(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const user = await registerArtisan(values)
      signIn(user)
      navigate('/artisan/pending', { replace: true })
    } catch (error) {
      setSubmitError(
        error.message === 'EMAIL_TAKEN'
          ? 'artisanRegister.emailTaken'
          : 'artisanRegister.genericError',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card artisan-register-card" onSubmit={handleSubmit} noValidate>
        <Link to="/" className="auth-brand">
          {translate('common.brand')}
        </Link>

        <h1 className="auth-title">{translate('artisanRegister.title')}</h1>

        <label className="auth-field">
          <span>{translate('artisanRegister.fullName')}</span>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && <span className="auth-error">{translate(errors.fullName)}</span>}
        </label>

        <label className="auth-field">
          <span>{translate('artisanRegister.phone')}</span>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <span className="auth-error">{translate(errors.phone)}</span>}
        </label>

        <label className="auth-field">
          <span>{translate('artisanRegister.email')}</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="auth-error">{translate(errors.email)}</span>}
        </label>

        <label className="auth-field">
          <span>{translate('artisanRegister.password')}</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="auth-error">{translate(errors.password)}</span>}
        </label>

        <div className="auth-field">
          <span>{translate('artisanRegister.categories')}</span>
          <div className="artisan-register-categories">
            {categories.map((category) => (
              <label key={category.id} className="artisan-register-category">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
          {errors.categoryIds && (
            <span className="auth-error">{translate(errors.categoryIds)}</span>
          )}
        </div>

        <label className="auth-field">
          <span>{translate('artisanRegister.bio')}</span>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} />
          {errors.bio && <span className="auth-error">{translate(errors.bio)}</span>}
        </label>

        {submitError && (
          <p className="auth-alert" role="alert">
            {translate(submitError)}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {translate(isSubmitting ? 'artisanRegister.submitting' : 'artisanRegister.submit')}
        </button>

        <p className="auth-switch">
          {translate('artisanRegister.haveAccount')}{' '}
          <Link to="/artisan/login">{translate('artisanRegister.login')}</Link>
        </p>
      </form>
    </main>
  )
}

export default ArtisanRegister