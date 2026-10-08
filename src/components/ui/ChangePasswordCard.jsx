import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { translate } from '../../i18n'
import { changePassword } from '../../services/authService'
import { validatePasswordChange } from '../../utils/validators'
import ActionError from './ActionError'
import './ChangePasswordCard.css'

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

const FIELDS = [
  { name: 'currentPassword', autoComplete: 'current-password' },
  { name: 'newPassword', autoComplete: 'new-password' },
  { name: 'confirmPassword', autoComplete: 'new-password' },
]

// بطاقة تغيير كلمة السر — مشتركة بين الساكن والحرفي والمشرف
function ChangePasswordCard({ className = '' }) {
  const reduceMotion = useReducedMotion()
  const [formData, setFormData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setIsDone(false)
    setSubmitError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validatePasswordChange(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await changePassword(formData)
      setFormData(EMPTY)
      setShowPasswords(false)
      setIsDone(true)
    } catch (error) {
      if (error.message === 'WRONG_PASSWORD') {
        setErrors({ currentPassword: 'changePassword.wrongCurrent' })
      } else {
        setSubmitError(
          error.message === 'INVALID_NEW_PASSWORD'
            ? 'changePassword.invalidNew'
            : error.message === 'NETWORK_ERROR'
              ? 'common.networkError'
              : 'changePassword.error',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`cp-card fx-card ${className}`} onSubmit={handleSubmit} noValidate>
      <div className="cp-head">
        <span className="cp-icon" aria-hidden="true">
          <KeyRound size={18} />
        </span>
        <div>
          <h2 className="cp-title">{translate('changePassword.title')}</h2>
          <p className="cp-hint">{translate('changePassword.hint')}</p>
        </div>
      </div>

      <div className="cp-grid">
        {FIELDS.map(({ name, autoComplete }) => (
          <label key={name} className={`fx-field cp-field--${name}`}>
            <span className="fx-label">{translate(`changePassword.${name}`)}</span>
            <input
              className="fx-input"
              type={showPasswords ? 'text' : 'password'}
              name={name}
              dir="ltr"
              value={formData[name]}
              onChange={handleChange}
              autoComplete={autoComplete}
              aria-invalid={Boolean(errors[name])}
            />
            {errors[name] && <span className="fx-error-text">{translate(errors[name])}</span>}
          </label>
        ))}
      </div>

      <label className="cp-show">
        <input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />
        {translate('changePassword.show')}
      </label>

      <AnimatePresence>
        {isDone && (
          <motion.p
            className="fx-notice fx-notice--success"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={18} aria-hidden="true" />
            {translate('changePassword.done')}
          </motion.p>
        )}
      </AnimatePresence>

      <ActionError messageKey={submitError} />

      <div className="cp-submit">
        <button type="submit" className="fx-btn fx-btn--secondary fx-btn--lg" disabled={isSubmitting}>
          {translate(isSubmitting ? 'changePassword.saving' : 'changePassword.save')}
        </button>
      </div>
    </form>
  )
}

export default ChangePasswordCard
