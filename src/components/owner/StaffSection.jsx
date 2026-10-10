import { useState } from 'react'
import { Mail, UserPlus } from 'lucide-react'
import { translate } from '../../i18n'
import { validateStaff } from '../../utils/validators'
import ActionError from '../ui/ActionError'

const EMPTY = { name: '', email: '', password: '' }

// مشرفو المجمع أو مدراء الشركة: القائمة + نموذج إضافة حساب جديد
function StaffSection({ titleKey, addKey, emptyKey, staff, onAdd }) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSaveError('')
  }

  function close() {
    setIsOpen(false)
    setFormData(EMPTY)
    setErrors({})
    setSaveError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateStaff(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSaving(true)
    try {
      await onAdd({ name: formData.name.trim(), email: formData.email.trim(), password: formData.password })
      close()
    } catch (error) {
      if (error.message === 'EMAIL_TAKEN') setErrors({ email: 'owner.staff.emailTaken' })
      else setSaveError(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="ow-staff">
      <p className="ow-label">{translate(titleKey)}</p>
      {staff.length > 0 ? (
        <ul className="ow-staff-list">
          {staff.map((person) => (
            <li key={person.id}>
              <span className="ow-staff-name">{person.name}</span>
              <span className="ow-staff-email" dir="ltr">
                <Mail size={12} aria-hidden="true" />
                {person.email}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ow-muted">{translate(emptyKey)}</p>
      )}

      {isOpen ? (
        <form className="ow-staff-form" onSubmit={handleSubmit} noValidate>
          {['name', 'email', 'password'].map((field) => (
            <label key={field} className="fx-field">
              <span className="fx-label">{translate(`owner.staff.${field}`)}</span>
              <input
                className="fx-input"
                name={field}
                type={field === 'password' ? 'text' : field === 'email' ? 'email' : 'text'}
                dir={field === 'name' ? undefined : 'ltr'}
                autoComplete="off"
                value={formData[field]}
                onChange={handleChange}
                aria-invalid={Boolean(errors[field])}
              />
              {errors[field] && <span className="fx-error-text">{translate(errors[field])}</span>}
            </label>
          ))}
          <p className="ow-hint">{translate('owner.staff.passwordHint')}</p>
          <ActionError messageKey={saveError} />
          <div className="ow-actions">
            <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={isSaving}>
              {translate(isSaving ? 'owner.common.saving' : 'owner.common.add')}
            </button>
            <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={close}>
              {translate('owner.common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="fx-btn fx-btn--secondary fx-btn--sm" onClick={() => setIsOpen(true)}>
          <UserPlus size={15} aria-hidden="true" />
          {translate(addKey)}
        </button>
      )}
    </div>
  )
}

export default StaffSection
