import { useEffect, useState } from 'react'
import { Building2, Link2, Pencil, Phone, Plus, Power } from 'lucide-react'
import { translate } from '../../i18n'
import { ErrorState, EmptyState, SkeletonList } from '../StatusState'
import PageHeader from '../ui/PageHeader'
import ActionError from '../ui/ActionError'
import { Reveal } from '../ui/Reveal'
import StaffSection from './StaffSection'
import '../../pages/Owner.css'

// صفحة مشتركة لإدارة المجمعات أو الشركات (config يحدد الحقول والنصوص والـ API)
function OwnerEntityPage({ config }) {
  const { ns, fields, api, metrics, partnersOf, staffOf, extra, Icon = Building2 } = config
  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, '']))

  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addErrors, setAddErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editErrors, setEditErrors] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false
    api
      .list()
      .then((data) => {
        if (!isCancelled) setItems(data)
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
  }, [api, attempt])

  function handleRetry() {
    setIsLoading(true)
    setLoadError(null)
    setAttempt((count) => count + 1)
  }

  const replaceItem = (updated) => setItems((list) => list.map((item) => (item.id === updated.id ? updated : item)))

  function errorFor(error) {
    if (error.message === 'NAME_TAKEN') return { name: 'owner.common.nameTaken' }
    setActionError(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
    return {}
  }

  function validate(form) {
    return form.name.trim() ? {} : { name: 'validation.required' }
  }

  async function handleAdd(event) {
    event.preventDefault()
    const errors = validate(addForm)
    setAddErrors(errors)
    if (Object.keys(errors).length) return
    setBusyId('new')
    setActionError('')
    try {
      const created = await api.create({ ...addForm, name: addForm.name.trim() })
      setItems((list) => [...list, created])
      setAddForm(emptyForm)
      setIsAdding(false)
    } catch (error) {
      setAddErrors(errorFor(error))
    } finally {
      setBusyId(null)
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm(Object.fromEntries(fields.map((f) => [f.name, item[f.name] || ''])))
    setEditErrors({})
  }

  async function handleSaveEdit(event) {
    event.preventDefault()
    const errors = validate(editForm)
    setEditErrors(errors)
    if (Object.keys(errors).length) return
    setBusyId(editingId)
    setActionError('')
    try {
      replaceItem(await api.update(editingId, { ...editForm, name: editForm.name.trim() }))
      setEditingId(null)
    } catch (error) {
      setEditErrors(errorFor(error))
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(item) {
    setBusyId(item.id)
    setActionError('')
    try {
      replaceItem(await api.update(item.id, { isActive: !item.isActive }))
    } catch (error) {
      errorFor(error)
    } finally {
      setBusyId(null)
    }
  }

  async function addStaff(item, staff) {
    const created = await api.addStaff(item.id, staff)
    setItems((list) =>
      list.map((current) =>
        current.id === item.id ? { ...current, [config.staffKey]: [...staffOf(current), created] } : current,
      ),
    )
  }

  function renderFields(form, setForm, errors, setErrors) {
    return fields.map((field) => (
      <label key={field.name} className={`fx-field ${field.wide ? 'ow-wide' : ''}`}>
        <span className="fx-label">{translate(`owner.${ns}.${field.name}`)}</span>
        <input
          className="fx-input"
          name={field.name}
          type={field.type || 'text'}
          dir={field.type === 'tel' ? 'ltr' : undefined}
          value={form[field.name]}
          onChange={(event) => {
            setForm((current) => ({ ...current, [field.name]: event.target.value }))
            setErrors((current) => ({ ...current, [field.name]: undefined }))
          }}
          aria-invalid={Boolean(errors[field.name])}
        />
        {errors[field.name] && <span className="fx-error-text">{translate(errors[field.name])}</span>}
      </label>
    ))
  }

  return (
    <section className="ow">
      <PageHeader
        title={translate(`owner.${ns}.title`)}
        meta={translate(`owner.${ns}.subtitle`)}
        actions={
          !isAdding && (
            <button type="button" className="fx-btn fx-btn--primary" onClick={() => setIsAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              {translate(`owner.${ns}.add`)}
            </button>
          )
        }
      />

      {isAdding && (
        <Reveal as="form" className="ow-panel fx-card" onSubmit={handleAdd} noValidate>
          <h2 className="ow-panel-title">{translate(`owner.${ns}.add`)}</h2>
          <div className="ow-form-grid">{renderFields(addForm, setAddForm, addErrors, setAddErrors)}</div>
          <div className="ow-actions">
            <button type="submit" className="fx-btn fx-btn--primary" disabled={busyId === 'new'}>
              {translate(busyId === 'new' ? 'owner.common.saving' : 'owner.common.save')}
            </button>
            <button
              type="button"
              className="fx-btn fx-btn--ghost"
              onClick={() => {
                setIsAdding(false)
                setAddForm(emptyForm)
                setAddErrors({})
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
          onRetry={handleRetry}
          retryLabel={translate('owner.common.retry')}
        />
      )}

      {!isLoading && !loadError && items.length === 0 && (
        <EmptyState icon={Icon} title={translate(`owner.${ns}.empty`)} message={translate(`owner.${ns}.emptyHint`)} />
      )}

      {!isLoading && !loadError && items.length > 0 && (
        <ul className="ow-list">
          {items.map((item) => {
            const isEditing = editingId === item.id
            const partners = partnersOf(item)
            return (
              <li key={item.id} className={`ow-card fx-card ${item.isActive ? '' : 'is-inactive'}`}>
                {isEditing ? (
                  <form onSubmit={handleSaveEdit} noValidate className="ow-edit">
                    <div className="ow-form-grid">{renderFields(editForm, setEditForm, editErrors, setEditErrors)}</div>
                    <div className="ow-actions">
                      <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={busyId === item.id}>
                        {translate(busyId === item.id ? 'owner.common.saving' : 'owner.common.save')}
                      </button>
                      <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => setEditingId(null)}>
                        {translate('owner.common.cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="ow-card-head">
                    <span className="ow-card-icon" aria-hidden="true">
                      <Icon size={20} />
                    </span>
                    <div className="ow-card-id">
                      <h2 className="ow-card-title">
                        {item.name}
                        <span className={`fx-badge ${item.isActive ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
                          {translate(item.isActive ? 'owner.common.active' : 'owner.common.inactive')}
                        </span>
                      </h2>
                      <p className="ow-card-meta">
                        {item.address && <span>{item.address}</span>}
                        {item.phone && (
                          <span dir="ltr">
                            <Phone size={12} aria-hidden="true" />
                            {item.phone}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="ow-card-tools">
                      <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => startEdit(item)}>
                        <Pencil size={14} aria-hidden="true" />
                        {translate('owner.common.edit')}
                      </button>
                      <button
                        type="button"
                        className="fx-btn fx-btn--ghost fx-btn--sm"
                        onClick={() => toggleActive(item)}
                        disabled={busyId === item.id}
                      >
                        <Power size={14} aria-hidden="true" />
                        {translate(item.isActive ? 'owner.common.deactivate' : 'owner.common.activate')}
                      </button>
                    </div>
                  </div>
                )}

                <dl className="ow-metrics">
                  {metrics(item).map(({ key, value }) => (
                    <div key={key}>
                      <dt>{translate(`owner.${ns}.${key}`)}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="ow-partners">
                  <p className="ow-label">
                    <Link2 size={13} aria-hidden="true" />
                    {translate(`owner.${ns}.partners`)}
                  </p>
                  {partners.length > 0 ? (
                    <ul className="ow-chips">
                      {partners.map((name) => (
                        <li key={name} className="fx-badge fx-badge--plain fx-badge--navy">
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ow-muted">{translate(`owner.${ns}.noPartners`)}</p>
                  )}
                </div>

                <StaffSection
                  titleKey={`owner.${ns}.staff`}
                  addKey={`owner.${ns}.addStaff`}
                  emptyKey={`owner.${ns}.noStaff`}
                  staff={staffOf(item)}
                  onAdd={(staff) => addStaff(item, staff)}
                />

                {extra?.(item, replaceItem)}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default OwnerEntityPage
