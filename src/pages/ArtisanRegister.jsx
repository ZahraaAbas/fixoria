import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, Check, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { registerArtisan } from '../services/authService'
import { getCategories } from '../services/categoriesService'
import { validateArtisanRegister } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import AuthShell from '../components/ui/AuthShell'

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
    <AuthShell title={translate('artisanRegister.title')} icon={Wrench} wide>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-grid">
          <label className="fx-field fx-field--full">
            <span className="fx-label">{translate('artisanRegister.fullName')}</span>
            <input
              className="fx-input"
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              autoComplete="name"
              aria-invalid={Boolean(errors.fullName)}
            />
            {errors.fullName && <span className="fx-error-text">{translate(errors.fullName)}</span>}
          </label>

          <label className="fx-field">
            <span className="fx-label">{translate('artisanRegister.phone')}</span>
            <input
              className="fx-input"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              autoComplete="tel"
              dir="ltr"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && <span className="fx-error-text">{translate(errors.phone)}</span>}
          </label>

          <label className="fx-field">
            <span className="fx-label">{translate('artisanRegister.email')}</span>
            <input
              className="fx-input"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              dir="ltr"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <span className="fx-error-text">{translate(errors.email)}</span>}
          </label>

          <label className="fx-field fx-field--full">
            <span className="fx-label">{translate('artisanRegister.password')}</span>
            <input
              className="fx-input"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="new-password"
              dir="ltr"
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && <span className="fx-error-text">{translate(errors.password)}</span>}
          </label>

          <fieldset className="fx-field fx-field--full auth-chips-field">
            <legend className="fx-label">{translate('artisanRegister.categories')}</legend>
            <div className="fx-chips">
              {categories.map((category) => (
                <label key={category.id} className="fx-chip">
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span className="fx-chip-check" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
            {errors.categoryIds && (
              <span className="fx-error-text">{translate(errors.categoryIds)}</span>
            )}
          </fieldset>

          <label className="fx-field fx-field--full">
            <span className="fx-label">{translate('artisanRegister.bio')}</span>
            <textarea
              className="fx-input"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              aria-invalid={Boolean(errors.bio)}
            />
            {errors.bio && <span className="fx-error-text">{translate(errors.bio)}</span>}
          </label>
        </div>

        {submitError && (
          <p className="auth-alert" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            {translate(submitError)}
          </p>
        )}

        <div className="auth-submit-row">
          <button
            type="submit"
            className="fx-btn fx-btn--primary fx-btn--lg fx-btn--block"
            disabled={isSubmitting}
          >
            {translate(isSubmitting ? 'artisanRegister.submitting' : 'artisanRegister.submit')}
          </button>
        </div>

        <div className="auth-links">
          <p>
            {translate('artisanRegister.haveAccount')}{' '}
            <Link to="/artisan/login">{translate('artisanRegister.login')}</Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}

export default ArtisanRegister