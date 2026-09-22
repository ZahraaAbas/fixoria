import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { translate } from '../i18n'
import { registerResident } from '../services/authService'
import { validateRegister } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

const fields = [
  { name: 'fullName', type: 'text', autoComplete: 'name' },
  { name: 'phone', type: 'tel', autoComplete: 'tel' },
  { name: 'building', type: 'text', autoComplete: 'off' },
  { name: 'apartment', type: 'text', autoComplete: 'off' },
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'password', type: 'password', autoComplete: 'new-password' },
]

const initialFormData = Object.fromEntries(fields.map((field) => [field.name, '']))

function Register() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validateRegister(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const user = await registerResident(formData)
      signIn(user)
      navigate('/home', { replace: true })
    } catch (error) {
      setSubmitError(
        error.message === 'EMAIL_TAKEN' ? 'register.emailTaken' : 'register.genericError',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <Link to="/" className="auth-brand">
          {translate('common.brand')}
        </Link>

        <h1 className="auth-title">{translate('register.title')}</h1>

        {fields.map((field) => (
          <label key={field.name} className="auth-field">
            <span>{translate(`register.${field.name}`)}</span>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              autoComplete={field.autoComplete}
              aria-invalid={Boolean(errors[field.name])}
            />
            {errors[field.name] && (
              <span className="auth-error">{translate(errors[field.name])}</span>
            )}
          </label>
        ))}

        {submitError && (
          <p className="auth-alert" role="alert">
            {translate(submitError)}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {translate(isSubmitting ? 'register.submitting' : 'register.submit')}
        </button>

        <p className="auth-switch">
          {translate('register.haveAccount')}{' '}
          <Link to="/login">{translate('register.login')}</Link>
        </p>
      </form>
    </main>
  )
}

export default Register