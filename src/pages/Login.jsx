import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { translate } from '../i18n'
import { login } from '../services/authService'
import { validateLogin } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import { Globe, Info, Headphones, Settings, Search } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')

  // دوال تفعيل الأيقونات
  const handleToggleLanguage = () => {
    const currentLang = localStorage.getItem('fixoria_lang') || 'ar'
    const newLang = currentLang === 'ar' ? 'en' : 'ar'
    localStorage.setItem('fixoria_lang', newLang)
    window.location.reload()
  }

  const handleInfo = () => {
    alert('منصة فكسوريا - مجمع البدور السكني لإدارة خدمات الصيانة والحرفيين')
  }

  const handleSupport = () => {
    alert('الدعم الفني: يمكنك التواصل معنا عبر البريد أو الهاتف المخصص للمجمع')
  }

  const handleSettings = () => {
    alert('إعدادات المنصة العامة')
  }

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
      {/* الشريط العلوي المرتب باستخدام أيقونات Lucide المضمونة */}
      <header className="auth-top-bar">
        <div className="auth-search-box">
          <Search size={18} color="#ffffff" />
          <input
            type="text"
            placeholder="بحث في الموقع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="auth-glass-actions">
          <button type="button" title="Language / اللغة" onClick={handleToggleLanguage}>
            <Globe size={18} />
          </button>
          <button type="button" title="About Us / من نحن" onClick={handleInfo}>
            <Info size={18} />
          </button>
          <button type="button" title="Contact Us / اتصل بنا" onClick={handleSupport}>
            <Headphones size={18} />
          </button>
          <button type="button" title="Settings / الإعدادات" onClick={handleSettings}>
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* كارد تسجيل الدخول في المنتصف */}
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