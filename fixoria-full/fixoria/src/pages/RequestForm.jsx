import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getCategoryById } from '../services/categoriesService'
import { createRequest } from '../services/requestsService'
import { apiFetch } from '../services/api'
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
    building: '',
    apartment: '',
    preferredDate: '',
  })
  const [images, setImages] = useState([])
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [createdRequest, setCreatedRequest] = useState(null)

  // نعبّي البناية ورقم الوحدة من ملف الساكن المحفوظ بالباكند
  useEffect(() => {
    let isCancelled = false
    apiFetch('/resident/me')
      .then((profile) => {
        if (isCancelled) return
        setFormData((current) => ({
          ...current,
          building: current.building || profile.building || '',
          apartment: current.apartment || profile.apartment_number || '',
        }))
      })
      .catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [user.id])

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
    setSubmitError('')
    try {
      const created = await createRequest({ categoryId: category.id, images, ...formData })
      setCreatedRequest(created)
    } catch (error) {
      setSubmitError(
        error.message === 'NETWORK_ERROR' ? translate('common.networkError') : error.detail || translate('request.genericError'),
      )
    } finally {
      setIsSubmitting(false)
    }
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

  if (createdRequest) {
    return (
      <div className="request-form-status">
        <p>
          #{createdRequest.id} — {translate('request.success')}
        </p>
        <p>
          <Link to="/my-requests">{translate('request.viewRequests')}</Link>
          {' · '}
          <Link to="/home">{translate('request.backHome')}</Link>
        </p>
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
          type="datetime-local"
          name="preferredDate"
          value={formData.preferredDate}
          onChange={handleChange}
          aria-invalid={Boolean(errors.preferredDate)}
        />
        {errors.preferredDate && (
          <span className="request-error">{translate(errors.preferredDate)}</span>
        )}
      </label>

      <label className="request-field">
        <span>{translate('request.images')}</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 5))}
        />
      </label>

      {submitError && (
        <p className="request-error" role="alert">
          {submitError}
        </p>
      )}

      <button type="submit" className="request-submit" disabled={isSubmitting}>
        {translate(isSubmitting ? 'request.submitting' : 'request.submit')}
      </button>
    </form>
  )
}

export default RequestForm