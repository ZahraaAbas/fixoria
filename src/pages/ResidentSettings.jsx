import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, MapPin, UserRound } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getResidentProfile, updateResidentProfile, uploadResidentAvatar } from '../services/profileService'
import { validateResidentProfile } from '../utils/validators'
import { ErrorState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import AvatarUploader from '../components/ui/AvatarUploader'
import ChangePasswordCard from '../components/ui/ChangePasswordCard'
import ActionError from '../components/ui/ActionError'
import { Reveal } from '../components/ui/Reveal'
import './ResidentSettings.css'

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  whatsapp: '',
  building: '',
  floor: '',
  apartment: '',
}

// الحقول مقسّمة لمجموعتين؛ half = نصف العرض على الشاشات الواسعة
const SECTIONS = [
  {
    titleKey: 'residentSettings.personalTitle',
    Icon: UserRound,
    fields: [
      { name: 'fullName', type: 'text', autoComplete: 'name' },
      { name: 'email', type: 'email', autoComplete: 'email', ltr: true },
      { name: 'phone', type: 'tel', autoComplete: 'tel', ltr: true, half: true },
      { name: 'whatsapp', type: 'tel', autoComplete: 'off', ltr: true, half: true },
    ],
  },
  {
    titleKey: 'residentSettings.addressTitle',
    Icon: MapPin,
    fields: [
      { name: 'building', type: 'text', autoComplete: 'off', third: true },
      { name: 'floor', type: 'text', autoComplete: 'off', third: true },
      { name: 'apartment', type: 'text', autoComplete: 'off', third: true },
    ],
  },
]

function ResidentSettings() {
  const { user, updateUser } = useAuth()
  const reduceMotion = useReducedMotion()

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [avatar, setAvatar] = useState(user.avatar || null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let isCancelled = false

    getResidentProfile()
      .then((profile) => {
        if (isCancelled) return
        setFormData({
          fullName: profile.fullName || '',
          email: profile.email || '',
          phone: profile.phone,
          whatsapp: profile.whatsapp,
          building: profile.building,
          floor: profile.floor,
          apartment: profile.apartment,
        })
        setAvatar(profile.avatar)
      })
      .catch((err) => {
        if (!isCancelled) setLoadError(err)
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
    setLoadError(null)
    setAttempt((count) => count + 1)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSavedMessage('')
  }

  async function handleAvatarUpload(file) {
    const profile = await uploadResidentAvatar(file)
    setAvatar(profile.avatar)
    updateUser({ avatar: profile.avatar })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validateResidentProfile(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSaveError('')
    setSavedMessage('')

    try {
      const profile = await updateResidentProfile(formData)
      updateUser({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        building: profile.building,
        apartment: profile.apartment,
      })
      setSavedMessage('residentSettings.saved')
    } catch (error) {
      setSaveError(
        error.message === 'EMAIL_TAKEN'
          ? 'residentSettings.emailTaken'
          : error.message === 'NETWORK_ERROR'
            ? 'common.networkError'
            : 'residentSettings.saveError',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rs">
      <PageHeader title={translate('residentSettings.title')} meta={translate('residentSettings.subtitle')} />

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('residentSettings.loading')}
          </p>
          <SkeletonList count={3} />
        </>
      )}

      {!isLoading && loadError && (
        <ErrorState
          message={translate('residentSettings.loadError')}
          onRetry={handleRetry}
          retryLabel={translate('residentSettings.retry')}
        />
      )}

      {!isLoading && !loadError && (
        <Reveal as="form" className="rs-card fx-card" onSubmit={handleSubmit} noValidate>
          <AvatarUploader src={avatar} name={formData.fullName || user.fullName} onUpload={handleAvatarUpload} />

          {SECTIONS.map(({ titleKey, Icon, fields }) => (
            <fieldset key={titleKey} className="rs-section">
              <legend className="rs-section-title">
                <Icon size={17} aria-hidden="true" />
                {translate(titleKey)}
              </legend>
              <div className="rs-grid">
                {fields.map((field) => (
                  <label
                    key={field.name}
                    className={`fx-field ${field.half ? 'rs-half' : ''} ${field.third ? 'rs-third' : ''}`}
                  >
                    <span className="fx-label">{translate(`residentSettings.${field.name}`)}</span>
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
                    {errors[field.name] && <span className="fx-error-text">{translate(errors[field.name])}</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <AnimatePresence>
            {savedMessage && (
              <motion.p
                className="fx-notice fx-notice--success"
                role="status"
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle2 size={18} aria-hidden="true" />
                {translate(savedMessage)}
              </motion.p>
            )}
          </AnimatePresence>

          <ActionError messageKey={saveError} />

          <div className="rs-submit">
            <button type="submit" className="fx-btn fx-btn--primary fx-btn--lg" disabled={isSubmitting}>
              {translate(isSubmitting ? 'residentSettings.saving' : 'residentSettings.save')}
            </button>
          </div>
        </Reveal>
      )}

      {!isLoading && !loadError && (
        <Reveal delay={0.1}>
          <ChangePasswordCard className="rs-password" />
        </Reveal>
      )}
    </section>
  )
}

export default ResidentSettings
