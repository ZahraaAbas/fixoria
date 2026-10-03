import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertCircle, Check, CheckCircle2, Phone } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { updateArtisanProfile } from '../services/profileService'
import { getCategories } from '../services/categoriesService'
import { validateArtisanProfile } from '../utils/validators'
import PageHeader from '../components/ui/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import './ArtisanSettings.css'

function ArtisanSettings() {
  const { user, updateUser } = useAuth()
  const reduceMotion = useReducedMotion()

  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    phone: user.phone || '',
    bio: user.bio || '',
  })
  const [categoryIds, setCategoryIds] = useState(user.categoryIds || [])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [saveError, setSaveError] = useState(false)

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
    setSavedMessage('')
  }

  function toggleCategory(categoryId) {
    setCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    )
    setErrors((current) => ({ ...current, categoryIds: undefined }))
    setSavedMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const values = { ...formData, categoryIds }
    const validationErrors = validateArtisanProfile(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)
    setSaveError(false)

    try {
      const updated = await updateArtisanProfile(values)
      updateUser(updated)
      setSavedMessage('artisanSettings.saved')
    } catch {
      setSaveError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedNames = categories
    .filter((category) => categoryIds.includes(category.id))
    .map((category) => category.name)

  return (
    <section>
      <PageHeader title={translate('artisanSettings.title')} />

      <div className="as-layout">
        <Reveal as="form" className="as-form fx-card" onSubmit={handleSubmit} noValidate>
          <div className="as-row">
            <label className="fx-field">
              <span className="fx-label">{translate('artisanSettings.fullName')}</span>
              <input
                className="fx-input"
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName && <span className="fx-error-text">{translate(errors.fullName)}</span>}
            </label>

            <label className="fx-field">
              <span className="fx-label">{translate('artisanSettings.phone')}</span>
              <input
                className="fx-input"
                type="tel"
                name="phone"
                dir="ltr"
                value={formData.phone}
                onChange={handleChange}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && <span className="fx-error-text">{translate(errors.phone)}</span>}
            </label>
          </div>

          <label className="fx-field">
            <span className="fx-label">{translate('artisanSettings.bio')}</span>
            <textarea
              className="fx-input"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              aria-invalid={Boolean(errors.bio)}
            />
            {errors.bio && <span className="fx-error-text">{translate(errors.bio)}</span>}
          </label>

          <fieldset className="fx-field as-fieldset">
            <legend className="fx-label">{translate('artisanSettings.categories')}</legend>
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
            {errors.categoryIds && <span className="fx-error-text">{translate(errors.categoryIds)}</span>}
          </fieldset>

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

          {saveError && (
            <p className="fx-notice fx-notice--danger" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {translate('artisanSettings.saveError')}
            </p>
          )}

          <div className="as-submit">
            <button type="submit" className="fx-btn fx-btn--primary fx-btn--lg" disabled={isSubmitting}>
              {translate(isSubmitting ? 'artisanSettings.saving' : 'artisanSettings.save')}
            </button>
          </div>
        </Reveal>

        {/* معاينة حية لما يُكتب في النموذج */}
        <Reveal as="aside" className="as-preview" delay={0.1} aria-label={translate('artisanSettings.preview')}>
          <p className="as-preview-label">{translate('artisanSettings.preview')}</p>
          <div className="as-preview-card fx-card fx-card--featured">
            <div className="as-preview-head">
              <span className="as-preview-avatar" aria-hidden="true">
                {formData.fullName.trim().charAt(0) || '?'}
              </span>
              <div className="as-preview-id">
                <p className="as-preview-name">{formData.fullName || '—'}</p>
                {formData.phone && (
                  <p className="as-preview-phone" dir="ltr">
                    <Phone size={13} aria-hidden="true" />
                    {formData.phone}
                  </p>
                )}
              </div>
            </div>
            {selectedNames.length > 0 && (
              <ul className="as-preview-tags">
                {selectedNames.map((name) => (
                  <li key={name} className="fx-badge fx-badge--plain">
                    {name}
                  </li>
                ))}
              </ul>
            )}
            {formData.bio && <p className="as-preview-bio">{formData.bio}</p>}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default ArtisanSettings
