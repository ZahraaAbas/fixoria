import { useEffect, useState } from 'react'
import { Check, HardHat, Mail, Pencil, Phone, Plus, Power, Star } from 'lucide-react'
import { translate } from '../i18n'
import { addCompanyArtisan, getCompanyArtisans, updateCompanyArtisan } from '../services/companyService'
import { getCategories } from '../services/categoriesService'
import { validateCompanyArtisan } from '../utils/validators'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import ActionError from '../components/ui/ActionError'
import Avatar from '../components/ui/Avatar'
import { Reveal } from '../components/ui/Reveal'
import './Owner.css'

const EMPTY = { fullName: '', email: '', password: '', phone: '', bio: '', categoryIds: [] }
const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function ServiceChips({ services, selected, onToggle }) {
  return (
    <div className="fx-chips">
      {services.map((service) => (
        <label key={service.id} className="fx-chip">
          <input type="checkbox" checked={selected.includes(service.id)} onChange={() => onToggle(service.id)} />
          <span className="fx-chip-check" aria-hidden="true">
            <Check size={12} strokeWidth={3} />
          </span>
          <span>{service.name}</span>
        </label>
      ))}
    </div>
  )
}

// حرفيو الشركة: إضافة حرفي، تعديل خدماته وبياناته، وإيقافه أو تفعيله
function CompanyArtisans() {
  const [artisans, setArtisans] = useState([])
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({ phone: '', bio: '', categoryIds: [] })
  const [editErrors, setEditErrors] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false
    Promise.all([getCompanyArtisans(), getCategories()])
      .then(([list, categories]) => {
        if (isCancelled) return
        setArtisans(list)
        setServices(categories)
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

  const replace = (updated) => setArtisans((list) => list.map((a) => (a.id === updated.id ? updated : a)))
  const failWith = (error) =>
    setActionError(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
  }

  async function handleAdd(event) {
    event.preventDefault()
    const validationErrors = validateCompanyArtisan(form)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length) return
    setBusyId('new')
    setActionError('')
    try {
      const created = await addCompanyArtisan({ ...form, fullName: form.fullName.trim(), email: form.email.trim() })
      setArtisans((list) => [created, ...list])
      setForm(EMPTY)
      setIsAdding(false)
    } catch (error) {
      if (error.message === 'EMAIL_TAKEN') setErrors({ email: 'owner.staff.emailTaken' })
      else failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  async function saveEdit(artisan) {
    const validationErrors = {}
    if (!edit.phone.trim()) validationErrors.phone = 'validation.required'
    if (edit.categoryIds.length === 0) validationErrors.categoryIds = 'validation.selectAtLeastOne'
    setEditErrors(validationErrors)
    if (Object.keys(validationErrors).length) return
    setBusyId(artisan.id)
    setActionError('')
    try {
      replace(await updateCompanyArtisan(artisan.id, { phone: edit.phone.trim(), bio: edit.bio, categoryIds: edit.categoryIds }))
      setEditingId(null)
    } catch (error) {
      failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(artisan) {
    setBusyId(artisan.id)
    setActionError('')
    try {
      replace(await updateCompanyArtisan(artisan.id, { isActive: !artisan.isActive }))
    } catch (error) {
      failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="ow">
      <PageHeader
        title={translate('company.artisans.title')}
        meta={translate('company.artisans.subtitle')}
        actions={
          !isAdding &&
          !isLoading &&
          !loadError && (
            <button type="button" className="fx-btn fx-btn--primary" onClick={() => setIsAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              {translate('company.artisans.add')}
            </button>
          )
        }
      />

      {isAdding && (
        <Reveal as="form" className="ow-panel fx-card" onSubmit={handleAdd} noValidate>
          <h2 className="ow-panel-title">{translate('company.artisans.add')}</h2>
          <div className="ow-form-grid">
            {[
              { name: 'fullName', type: 'text' },
              { name: 'phone', type: 'tel', ltr: true },
              { name: 'email', type: 'email', ltr: true },
              { name: 'password', type: 'text', ltr: true },
            ].map(({ name, type, ltr }) => (
              <label key={name} className="fx-field">
                <span className="fx-label">{translate(`company.artisans.${name}`)}</span>
                <input
                  className="fx-input"
                  name={name}
                  type={type}
                  dir={ltr ? 'ltr' : undefined}
                  autoComplete="off"
                  value={form[name]}
                  onChange={(event) => setField(name, event.target.value)}
                  aria-invalid={Boolean(errors[name])}
                />
                {errors[name] && <span className="fx-error-text">{translate(errors[name])}</span>}
              </label>
            ))}
            <label className="fx-field ow-wide">
              <span className="fx-label">{translate('company.artisans.bio')}</span>
              <textarea className="fx-input" rows={2} value={form.bio} onChange={(event) => setField('bio', event.target.value)} />
            </label>
          </div>
          <p className="ow-hint">{translate('owner.staff.passwordHint')}</p>
          <fieldset className="fx-field ow-fieldset">
            <legend className="fx-label">{translate('company.artisans.services')}</legend>
            <ServiceChips
              services={services}
              selected={form.categoryIds}
              onToggle={(id) => setField('categoryIds', toggleIn(form.categoryIds, id))}
            />
            {errors.categoryIds && <span className="fx-error-text">{translate(errors.categoryIds)}</span>}
          </fieldset>
          <div className="ow-actions">
            <button type="submit" className="fx-btn fx-btn--primary" disabled={busyId === 'new'}>
              {translate(busyId === 'new' ? 'owner.common.saving' : 'owner.common.add')}
            </button>
            <button
              type="button"
              className="fx-btn fx-btn--ghost"
              onClick={() => {
                setIsAdding(false)
                setForm(EMPTY)
                setErrors({})
              }}
            >
              {translate('owner.common.cancel')}
            </button>
          </div>
        </Reveal>
      )}

      <ActionError messageKey={actionError} className="ow-error" />

      {isLoading && <SkeletonList count={3} />}

      {!isLoading && loadError && (
        <ErrorState
          message={translate('owner.common.loadError')}
          onRetry={() => {
            setIsLoading(true)
            setLoadError(null)
            setAttempt((n) => n + 1)
          }}
          retryLabel={translate('owner.common.retry')}
        />
      )}

      {!isLoading && !loadError && artisans.length === 0 && (
        <EmptyState icon={HardHat} title={translate('company.artisans.empty')} message={translate('company.artisans.emptyHint')} />
      )}

      {!isLoading && !loadError && artisans.length > 0 && (
        <ul className="ow-list">
          {artisans.map((artisan) => {
            const isEditing = editingId === artisan.id
            return (
              <li key={artisan.id} className={`ow-card fx-card ${artisan.isActive ? '' : 'is-inactive'}`}>
                <div className="ow-card-head">
                  <Avatar src={artisan.avatar} name={artisan.fullName} className="ow-card-icon" />
                  <div className="ow-card-id">
                    <h2 className="ow-card-title">
                      {artisan.fullName}
                      <span className={`fx-badge ${artisan.isActive ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
                        {translate(artisan.isActive ? 'owner.common.active' : 'owner.common.inactive')}
                      </span>
                    </h2>
                    <p className="ow-card-meta">
                      <span dir="ltr">
                        <Mail size={12} aria-hidden="true" />
                        {artisan.email}
                      </span>
                      {artisan.phone && (
                        <span dir="ltr">
                          <Phone size={12} aria-hidden="true" />
                          {artisan.phone}
                        </span>
                      )}
                      {artisan.rating != null && (
                        <span>
                          <Star size={12} aria-hidden="true" />
                          {artisan.rating.toFixed(1)} ({artisan.reviewsCount})
                        </span>
                      )}
                    </p>
                  </div>
                  {!isEditing && (
                    <div className="ow-card-tools">
                      <button
                        type="button"
                        className="fx-btn fx-btn--ghost fx-btn--sm"
                        onClick={() => {
                          setEditingId(artisan.id)
                          setEdit({ phone: artisan.phone, bio: artisan.bio, categoryIds: artisan.categoryIds })
                          setEditErrors({})
                        }}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        {translate('owner.common.edit')}
                      </button>
                      <button
                        type="button"
                        className="fx-btn fx-btn--ghost fx-btn--sm"
                        onClick={() => toggleActive(artisan)}
                        disabled={busyId === artisan.id}
                      >
                        <Power size={14} aria-hidden="true" />
                        {translate(artisan.isActive ? 'owner.common.deactivate' : 'owner.common.activate')}
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="ow-edit">
                    <div className="ow-form-grid">
                      <label className="fx-field">
                        <span className="fx-label">{translate('company.artisans.phone')}</span>
                        <input
                          className="fx-input"
                          type="tel"
                          dir="ltr"
                          value={edit.phone}
                          onChange={(event) => setEdit((current) => ({ ...current, phone: event.target.value }))}
                          aria-invalid={Boolean(editErrors.phone)}
                        />
                        {editErrors.phone && <span className="fx-error-text">{translate(editErrors.phone)}</span>}
                      </label>
                      <label className="fx-field ow-wide">
                        <span className="fx-label">{translate('company.artisans.bio')}</span>
                        <textarea
                          className="fx-input"
                          rows={2}
                          value={edit.bio}
                          onChange={(event) => setEdit((current) => ({ ...current, bio: event.target.value }))}
                        />
                      </label>
                    </div>
                    <fieldset className="fx-field ow-fieldset">
                      <legend className="fx-label">{translate('company.artisans.services')}</legend>
                      <ServiceChips
                        services={services}
                        selected={edit.categoryIds}
                        onToggle={(id) => setEdit((current) => ({ ...current, categoryIds: toggleIn(current.categoryIds, id) }))}
                      />
                      {editErrors.categoryIds && <span className="fx-error-text">{translate(editErrors.categoryIds)}</span>}
                    </fieldset>
                    <div className="ow-actions">
                      <button
                        type="button"
                        className="fx-btn fx-btn--primary fx-btn--sm"
                        onClick={() => saveEdit(artisan)}
                        disabled={busyId === artisan.id}
                      >
                        {translate(busyId === artisan.id ? 'owner.common.saving' : 'owner.common.save')}
                      </button>
                      <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => setEditingId(null)}>
                        {translate('owner.common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <ul className="ow-chips">
                      {artisan.categoryNames.map((name) => (
                        <li key={name} className="fx-badge fx-badge--plain fx-badge--navy">
                          {name}
                        </li>
                      ))}
                    </ul>
                    {artisan.bio && <p className="ow-muted">{artisan.bio}</p>}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default CompanyArtisans
