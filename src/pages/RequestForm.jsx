import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { AlertCircle, CalendarDays, Check, Clock, FileText, Home, ListChecks, MessageSquareHeart, SearchX, Send } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { getCategoryById } from '../services/categoriesService'
import { createResidentRequest } from '../services/requestsService'
import { validateRequest } from '../utils/validators'
import { todayInputValue } from '../utils/formatDate'
import { serviceVisuals, defaultServiceVisual } from '../config/serviceVisuals'
import { LoadingState, EmptyState } from '../components/StatusState'
import PageHeader, { BackLink } from '../components/ui/PageHeader'
import { Reveal } from '../components/ui/Reveal'
import { easeOut } from '../components/ui/motion'
import PhotoPicker from '../components/ui/PhotoPicker'
import VoiceRecorder from '../components/ui/VoiceRecorder'
import './RequestForm.css'

const STEPS = [
  { titleKey: 'home.howStep1Title', Icon: ListChecks },
  { titleKey: 'home.howStep2Title', Icon: Send },
  { titleKey: 'home.howStep3Title', Icon: MessageSquareHeart },
]

function RequestForm() {
  const { categoryId } = useParams()
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()

  const [category, setCategory] = useState(null)
  const [isLoadingCategory, setIsLoadingCategory] = useState(true)
  const [categoryError, setCategoryError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    building: user.building || '',
    apartment: user.apartment || '',
    preferredDate: '',
    preferredTime: '',
  })
  const [images, setImages] = useState([])
  const [voiceNote, setVoiceNote] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState(false)

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
    setSubmitError(false)

    try {
      const { preferredTime, ...fields } = formData
      await createResidentRequest({
        categoryId: category.id,
        contactName: user.fullName,
        ...fields,
        // وقت محلي (2026-10-08T10:30)، الخدمة تحوله لـ UTC قبل الإرسال
        preferredDate: `${formData.preferredDate}T${preferredTime}`,
        images,
        audio: voiceNote,
      })
      setIsSuccess(true)
    } catch {
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingCategory) {
    return <LoadingState message={translate('request.loadingCategory')} />
  }

  if (categoryError) {
    return (
      <EmptyState
        icon={SearchX}
        title={translate('request.categoryNotFound')}
        action={
          <Link to="/home" className="fx-btn fx-btn--secondary">
            {translate('request.backHome')}
          </Link>
        }
      />
    )
  }

  const { Icon: CategoryIcon, gradient } = serviceVisuals[category.icon] || defaultServiceVisual

  if (isSuccess) {
    return (
      <motion.div
        className="rf-success fx-card"
        role="status"
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        <span className="rf-success-burst" aria-hidden="true" />
        <motion.span
          className="rf-success-icon"
          aria-hidden="true"
          initial={reduceMotion ? false : { scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
        >
          <Check size={36} strokeWidth={3} />
        </motion.span>
        <p className="rf-success-category">
          <CategoryIcon size={16} aria-hidden="true" />
          {category.name}
        </p>
        <p className="rf-success-text">{translate('request.success')}</p>
        <div className="rf-success-actions">
          <Link to="/my-requests" className="fx-btn fx-btn--primary">
            <FileText size={16} aria-hidden="true" />
            {translate('nav.myRequests')}
          </Link>
          <Link to="/home" className="fx-btn fx-btn--secondary">
            <Home size={16} aria-hidden="true" />
            {translate('request.backHome')}
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="rf">
      <PageHeader
        back={<BackLink to="/home">{translate('request.backHome')}</BackLink>}
        title={translate('request.title')}
      />

      <div className="rf-layout">
        <Reveal as="form" className="rf-form fx-card" onSubmit={handleSubmit} noValidate>
          <label className="fx-field">
            <span className="fx-label">{translate('request.titleField')}</span>
            <input
              className="fx-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <span className="fx-error-text">{translate(errors.title)}</span>}
          </label>

          <label className="fx-field">
            <span className="fx-label">{translate('request.description')}</span>
            <textarea
              className="fx-input"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description && (
              <span className="fx-error-text">{translate(errors.description)}</span>
            )}
          </label>

          <div className="fx-field">
            <span className="fx-label" id="rf-photos-label">
              {translate('request.photosLabel')}
            </span>
            <div role="group" aria-labelledby="rf-photos-label">
              <PhotoPicker files={images} onChange={setImages} />
            </div>
          </div>

          <div className="fx-field">
            <span className="fx-label" id="rf-voice-label">
              {translate('request.voiceLabel')}
            </span>
            <div role="group" aria-labelledby="rf-voice-label">
              <VoiceRecorder onChange={setVoiceNote} />
            </div>
          </div>

          <div className="rf-row">
            <label className="fx-field">
              <span className="fx-label">{translate('request.building')}</span>
              <input
                className="fx-input"
                type="text"
                name="building"
                value={formData.building}
                onChange={handleChange}
                aria-invalid={Boolean(errors.building)}
              />
              {errors.building && <span className="fx-error-text">{translate(errors.building)}</span>}
            </label>

            <label className="fx-field">
              <span className="fx-label">{translate('request.apartment')}</span>
              <input
                className="fx-input"
                type="text"
                name="apartment"
                value={formData.apartment}
                onChange={handleChange}
                aria-invalid={Boolean(errors.apartment)}
              />
              {errors.apartment && (
                <span className="fx-error-text">{translate(errors.apartment)}</span>
              )}
            </label>
          </div>

          <div className="rf-row">
            <label className="fx-field">
              <span className="fx-label">
                <CalendarDays size={15} aria-hidden="true" className="rf-label-icon" />
                {translate('request.preferredDate')}
              </span>
              <input
                className="fx-input"
                type="date"
                name="preferredDate"
                min={todayInputValue()}
                value={formData.preferredDate}
                onChange={handleChange}
                aria-invalid={Boolean(errors.preferredDate)}
              />
              {errors.preferredDate && (
                <span className="fx-error-text">{translate(errors.preferredDate)}</span>
              )}
            </label>

            <label className="fx-field">
              <span className="fx-label">
                <Clock size={15} aria-hidden="true" className="rf-label-icon" />
                {translate('request.preferredTime')}
              </span>
              <input
                className="fx-input"
                type="time"
                name="preferredTime"
                value={formData.preferredTime}
                onChange={handleChange}
                aria-invalid={Boolean(errors.preferredTime)}
              />
              {errors.preferredTime && (
                <span className="fx-error-text">{translate(errors.preferredTime)}</span>
              )}
            </label>
          </div>

          {submitError && (
            <p className="fx-notice fx-notice--danger" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              {translate('request.submitError')}
            </p>
          )}

          <button
            type="submit"
            className="fx-btn fx-btn--primary fx-btn--lg fx-btn--block"
            disabled={isSubmitting}
          >
            {translate(isSubmitting ? 'request.submitting' : 'request.submit')}
            {!isSubmitting && <Send size={17} aria-hidden="true" />}
          </button>
        </Reveal>

        <Reveal as="aside" className="rf-aside" delay={0.15}>
          <div className="rf-aside-card fx-surface-depth">
            <span className="rf-aside-icon" style={{ background: gradient }} aria-hidden="true">
              <CategoryIcon size={30} strokeWidth={1.8} />
            </span>
            <p className="rf-aside-name">
              <span className="rf-aside-label">{translate('request.category')}</span>
              {category.name}
            </p>
            <ol className="rf-steps">
              {STEPS.map(({ titleKey, Icon }, index) => (
                <li key={titleKey} className={index === 1 ? 'is-current' : index === 0 ? 'is-done' : ''}>
                  <span className="rf-step-icon" aria-hidden="true">
                    {index === 0 ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </span>
                  {translate(titleKey)}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

export default RequestForm
