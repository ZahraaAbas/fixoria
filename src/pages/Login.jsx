import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { AlertCircle, ArrowLeft, Shield, UserCheck, Wrench } from 'lucide-react'
import { translate } from '../i18n'
import { login } from '../services/authService'
import { validateLogin } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import AuthShell from '../components/ui/AuthShell'

const REGISTER_PATH = {
  resident: '/register',
  artisan: '/artisan/register',
}

const ROLE_ICON = {
  resident: UserCheck,
  artisan: Wrench,
  admin: Shield,
}

const DEFAULT_REDIRECT = {
  resident: '/home',
  artisan: '/artisan/dashboard',
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
          : error.message === 'NETWORK_ERROR'
            ? 'common.networkError'
            : 'login.genericError',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell title={translate(`login.title.${role}`)} icon={ROLE_ICON[role]}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="fx-field">
          <span className="fx-label">{translate('login.email')}</span>
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

        <label className="fx-field">
          <span className="fx-label">{translate('login.password')}</span>
          <input
            className="fx-input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            dir="ltr"
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <span className="fx-error-text">{translate(errors.password)}</span>}
        </label>

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
            {translate(isSubmitting ? 'login.submitting' : 'login.submit')}
            {!isSubmitting && <ArrowLeft size={18} aria-hidden="true" className="icon-forward" />}
          </button>
        </div>

        <div className="auth-links">
          {REGISTER_PATH[role] && (
            <p>
              {translate('login.noAccount')}{' '}
              <Link to={REGISTER_PATH[role]}>{translate('login.createAccount')}</Link>
            </p>
          )}
          <Link to="/" className="auth-back">
            {translate('login.backHome')}
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

export default Login
