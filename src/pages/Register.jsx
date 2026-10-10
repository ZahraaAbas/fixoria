import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, UserPlus } from 'lucide-react'
import { translate } from '../i18n'
import { getCompoundOptions, registerResident } from '../services/authService'
import { validateRegister } from '../utils/validators'
import { useAuth } from '../hooks/useAuth'
import AuthShell from '../components/ui/AuthShell'

const fields = [
  { name: 'fullName', type: 'text', autoComplete: 'name' },
  { name: 'phone', type: 'tel', autoComplete: 'tel', ltr: true },
  // half: البناية والشقة جنبًا إلى جنب
  { name: 'building', type: 'text', autoComplete: 'off', half: true },
  { name: 'apartment', type: 'text', autoComplete: 'off', half: true },
  { name: 'email', type: 'email', autoComplete: 'email', ltr: true },
  { name: 'password', type: 'password', autoComplete: 'new-password', ltr: true },
]

const initialFormData = { compoundId: '', ...Object.fromEntries(fields.map((field) => [field.name, ''])) }

function Register() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [compounds, setCompounds] = useState(null)
  const [compoundsFailed, setCompoundsFailed] = useState(false)

  useEffect(() => {
    let isCancelled = false
    getCompoundOptions()
      .then((data) => {
        if (isCancelled) return
        setCompounds(data)
        // مجمع واحد بس: نختاره مباشرة
        if (data.length === 1) setFormData((current) => ({ ...current, compoundId: String(data[0].id) }))
      })
      .catch(() => {
        if (!isCancelled) setCompoundsFailed(true)
      })
    return () => {
      isCancelled = true
    }
  }, [])

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
      // الساكن الجديد ينتظر موافقة إدارة المجمع
      navigate('/resident/pending', { replace: true })
    } catch (error) {
      setSubmitError(
        error.message === 'EMAIL_TAKEN'
          ? 'register.emailTaken'
          : error.message === 'COMPOUND_REQUIRED'
            ? 'register.compoundRequired'
            : error.message === 'NETWORK_ERROR'
            ? 'common.networkError'
            : 'register.genericError',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell title={translate('register.title')} icon={UserPlus}>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-grid">
          <label className="fx-field fx-field--full">
            <span className="fx-label">{translate('register.compound')}</span>
            <select
              className="fx-input"
              name="compoundId"
              value={formData.compoundId}
              onChange={handleChange}
              disabled={!compounds || compounds.length === 0}
              aria-invalid={Boolean(errors.compoundId)}
            >
              <option value="">
                {translate(
                  compoundsFailed
                    ? 'register.compoundsFailed'
                    : !compounds
                      ? 'common.loading'
                      : compounds.length === 0
                        ? 'register.noCompounds'
                        : 'register.chooseCompound',
                )}
              </option>
              {(compounds || []).map((compound) => (
                <option key={compound.id} value={compound.id}>
                  {compound.name}
                </option>
              ))}
            </select>
            <span className="auth-hint">{translate('register.compoundHint')}</span>
            {errors.compoundId && <span className="fx-error-text">{translate(errors.compoundId)}</span>}
          </label>

          {fields.map((field) => (
            <label key={field.name} className={field.half ? 'fx-field' : 'fx-field fx-field--full'}>
              <span className="fx-label">{translate(`register.${field.name}`)}</span>
              <input
                className="fx-input"
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                autoComplete={field.autoComplete}
                dir={field.ltr ? 'ltr' : undefined}
                aria-invalid={Boolean(errors[field.name])}
              />
              {errors[field.name] && (
                <span className="fx-error-text">{translate(errors[field.name])}</span>
              )}
            </label>
          ))}
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
            {translate(isSubmitting ? 'register.submitting' : 'register.submit')}
          </button>
        </div>

        <div className="auth-links">
          <p>
            {translate('register.haveAccount')}{' '}
            <Link to="/login">{translate('register.login')}</Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}

export default Register