import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { translate } from '../i18n'
import { login } from '../services/authService'
import { validateLogin } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

const REGISTER_PATH = {
  resident: '/register',
  artisan: '/artisan/register',
}

const DEFAULT_REDIRECT = {
  resident: '/home',
  artisan: '/artisan/requests',
  admin: '/admin/dashboard',
}

function Login({ role }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
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

    const validationErrors = validateLogin(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const user = await login(formData)

      if (user.role !== role) {
        setSubmitError('login.wrongRole')
        return
      }

      signIn(user)

      if (user.role === 'artisan' && user.status !== 'approved') {
        navigate('/artisan/pending', { replace: true })
        return
      }

      const from = location.state?.from
      const redirectTo = from
        ? `${from.pathname}${from.search || ''}`
        : DEFAULT_REDIRECT[role]
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(
        error.message === 'INVALID_CREDENTIALS'
          ? 'login.invalidCredentials'
          : 'login.genericError',
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

        <h1 className="auth-title">{translate(`login.title.${role}`)}</h1>

        <label className="auth-field">
          <span>{translate('login.email')}</span>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <span className="auth-error">{translate(errors.email)}</span>
          )}
        </label>

        <label className="auth-field">
          <span>{translate('login.password')}</span>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && (
            <span className="auth-error">{translate(errors.password)}</span>
          )}
        </label>

        {submitError && (
          <p className="auth-alert" role="alert">
            {translate(submitError)}
          </p>
        )}

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {translate(isSubmitting ? 'login.submitting' : 'login.submit')}
        </button>

        {REGISTER_PATH[role] && (
          <p className="auth-switch">
            {translate('login.noAccount')}{' '}
            <Link to={REGISTER_PATH[role]}>{translate('login.createAccount')}</Link>
          </p>
        )}

        <Link to="/" className="auth-back">
          {translate('login.backHome')}
        </Link>
      </form>
    </main>
  )
}

export default Login