import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getCategoryById } from '../services/categoriesService'
import { createRequest } from '../services/requestsService'
import { validateRequest } from '../utils/validators'
import './RequestForm.css'

function RequestForm() {
  const { categoryId } = useParams()
  const { user } = useAuth()

  const [category, setCategory] = useState(null)
  const [isLoadingCategory, setIsLoadingCategory] = useState(true)
  const [categoryError, setCategoryError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: user.building || '',
    apartment: user.apartment || '',
    preferredDate: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    let isCancelled = false

    getCategoryById(categoryId)
      .then((data) => {
        if (!isCancelled) setCategory(data)
      })
      .catch((err) => {
        if (!isCancelled) setCategoryError(err)
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingCategory(false)
      })

    return () => {
      isCancelled = true
    }
  }, [categoryId])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validateRequest(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)

    await createRequest({
      residentId: user.id,
      categoryId: category.id,
      categoryName: category.name,
      ...formData,
    })

    setIsSubmitting(false)
    setIsSuccess(true)
  }

  if (isLoadingCategory) {
    return <p className="request-form-status">{translate('request.loadingCategory')}</p>
  }

  if (categoryError) {
    return (
      <div className="request-form-status">
        <p>{translate('request.categoryNotFound')}</p>
        <Link to="/home">{translate('request.backHome')}</Link>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="request-form-status">
        <p>{translate('request.success')}</p>
        <Link to="/home">{translate('request.backHome')}</Link>
      </div>
    )
  }

  return (
    <form className="request-form" onSubmit={handleSubmit} noValidate>
      <h1>{translate('request.title')}</h1>
      <p className="request-form-category">
        {translate('request.category')}: {category.name}
      </p>

      <label className="request-field">
        <span>{translate('request.titleField')}</span>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <span className="request-error">{translate(errors.title)}</span>}
      </label>

      <label className="request-field">
        <span>{translate('request.description')}</span>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && (
          <span className="request-error">{translate(errors.description)}</span>
        )}
      </label>

      <div className="request-field-row">
        <label className="request-field">
          <span>{translate('request.building')}</span>
          <input
            type="text"
            name="building"
            value={formData.building}
            onChange={handleChange}
            aria-invalid={Boolean(errors.building)}
          />
          {errors.building && (
            <span className="request-error">{translate(errors.building)}</span>
          )}
        </label>

        <label className="request-field">
          <span>{translate('request.apartment')}</span>
          <input
            type="text"
            name="apartment"
            value={formData.apartment}
            onChange={handleChange}
            aria-invalid={Boolean(errors.apartment)}
          />
          {errors.apartment && (
            <span className="request-error">{translate(errors.apartment)}</span>
          )}
        </label>
      </div>

      <label className="request-field">
        <span>{translate('request.preferredDate')}</span>
        <input
          type="date"
          name="preferredDate"
          value={formData.preferredDate}
          onChange={handleChange}
          aria-invalid={Boolean(errors.preferredDate)}
        />
        {errors.preferredDate && (
          <span className="request-error">{translate(errors.preferredDate)}</span>
        )}
      </label>

      <button type="submit" className="request-submit" disabled={isSubmitting}>
        {translate(isSubmitting ? 'request.submitting' : 'request.submit')}
      </button>
    </form>
  )
}

export default RequestForm