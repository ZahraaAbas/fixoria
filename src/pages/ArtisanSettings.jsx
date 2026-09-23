import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { updateArtisanProfile } from '../services/profileService'
import { getCategories } from '../services/categoriesService'
import { validateArtisanProfile } from '../utils/validators'
import './ArtisanSettings.css'

function ArtisanSettings() {
  const { user, updateUser } = useAuth()

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
    const updated = await updateArtisanProfile(user.id, values)
    updateUser(updated)
    setIsSubmitting(false)
    setSavedMessage('artisanSettings.saved')
  }

  return (
    <section>
      <h1>{translate('artisanSettings.title')}</h1>

      <form className="artisan-settings-form" onSubmit={handleSubmit} noValidate>
        <label className="artisan-settings-field">
          <span>{translate('artisanSettings.fullName')}</span>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            aria-invalid={Boolean(errors.fullName)}
          />
          {errors.fullName && (
            <span className="artisan-settings-error">{translate(errors.fullName)}</span>
          )}
        </label>

        <label className="artisan-settings-field">
          <span>{translate('artisanSettings.phone')}</span>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && (
            <span className="artisan-settings-error">{translate(errors.phone)}</span>
          )}
        </label>

        <label className="artisan-settings-field">
          <span>{translate('artisanSettings.bio')}</span>
          <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} />
          {errors.bio && (
            <span className="artisan-settings-error">{translate(errors.bio)}</span>
          )}
        </label>

        <div className="artisan-settings-field">
          <span>{translate('artisanSettings.categories')}</span>
          <div className="artisan-settings-categories">
            {categories.map((category) => (
              <label key={category.id} className="artisan-settings-category">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(category.id)}
                  onChange={() => toggleCategory(category.id)}
                />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
          {errors.categoryIds && (
            <span className="artisan-settings-error">{translate(errors.categoryIds)}</span>
          )}
        </div>

        {savedMessage && (
          <p className="artisan-settings-saved" role="status">
            {translate(savedMessage)}
          </p>
        )}

        <button type="submit" className="artisan-settings-submit" disabled={isSubmitting}>
          {translate(isSubmitting ? 'artisanSettings.saving' : 'artisanSettings.save')}
        </button>
      </form>
    </section>
  )
}

export default ArtisanSettings