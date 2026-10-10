import { useEffect, useState } from 'react'
import { ArrowLeftRight, Check, Handshake, Pencil, Plus, Power } from 'lucide-react'
import { translate } from '../i18n'
import { createAgreement, getAgreements, getCompanies, getCompounds, updateAgreement } from '../services/ownerService'
import { getCategories } from '../services/categoriesService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import ActionError from '../components/ui/ActionError'
import { Reveal } from '../components/ui/Reveal'
import './Owner.css'

const EMPTY_FORM = { compoundId: '', companyId: '', serviceIds: [] }

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

const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function OwnerAgreements() {
  const [data, setData] = useState({ agreements: [], compounds: [], companies: [], services: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editServices, setEditServices] = useState([])
  const [editError, setEditError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false
    Promise.all([getAgreements(), getCompounds(), getCompanies(), getCategories()])
      .then(([agreements, compounds, companies, services]) => {
        if (!isCancelled) setData({ agreements, compounds, companies, services })
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

  const serviceName = (id) => data.services.find((s) => s.id === id)?.name ?? `#${id}`
  const replaceAgreement = (updated) =>
    setData((current) => ({
      ...current,
      agreements: current.agreements.map((a) => (a.id === updated.id ? updated : a)),
    }))

  function failWith(error) {
    setActionError(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
  }

  async function handleAdd(event) {
    event.preventDefault()
    const errors = {}
    if (!form.compoundId) errors.compoundId = 'validation.required'
    if (!form.companyId) errors.companyId = 'validation.required'
    if (form.serviceIds.length === 0) errors.serviceIds = 'validation.selectAtLeastOne'
    setFormErrors(errors)
    if (Object.keys(errors).length) return

    setBusyId('new')
    setActionError('')
    try {
      const created = await createAgreement({
        compoundId: Number(form.compoundId),
        companyId: Number(form.companyId),
        serviceIds: form.serviceIds,
      })
      setData((current) => ({ ...current, agreements: [...current.agreements, created] }))
      setForm(EMPTY_FORM)
      setIsAdding(false)
    } catch (error) {
      if (error.message === 'AGREEMENT_EXISTS') setFormErrors({ companyId: 'owner.agreements.exists' })
      else failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  async function saveServices(agreement) {
    if (editServices.length === 0) {
      setEditError('validation.selectAtLeastOne')
      return
    }
    setBusyId(agreement.id)
    setActionError('')
    try {
      replaceAgreement(await updateAgreement(agreement.id, { serviceIds: editServices }))
      setEditingId(null)
    } catch (error) {
      failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(agreement) {
    setBusyId(agreement.id)
    setActionError('')
    try {
      replaceAgreement(await updateAgreement(agreement.id, { isActive: !agreement.isActive }))
    } catch (error) {
      failWith(error)
    } finally {
      setBusyId(null)
    }
  }

  const canCreate = data.compounds.length > 0 && data.companies.length > 0

  return (
    <section className="ow">
      <PageHeader
        title={translate('owner.agreements.title')}
        meta={translate('owner.agreements.subtitle')}
        actions={
          !isAdding &&
          !isLoading &&
          !loadError && (
            <button
              type="button"
              className="fx-btn fx-btn--primary"
              onClick={() => setIsAdding(true)}
              disabled={!canCreate}
              title={canCreate ? undefined : translate('owner.agreements.needSetup')}
            >
              <Plus size={16} aria-hidden="true" />
              {translate('owner.agreements.add')}
            </button>
          )
        }
      />

      {isAdding && (
        <Reveal as="form" className="ow-panel fx-card" onSubmit={handleAdd} noValidate>
          <h2 className="ow-panel-title">{translate('owner.agreements.add')}</h2>
          <div className="ow-form-grid">
            {[
              { name: 'compoundId', label: 'compound', options: data.compounds },
              { name: 'companyId', label: 'company', options: data.companies },
            ].map(({ name, label, options }) => (
              <label key={name} className="fx-field">
                <span className="fx-label">{translate(`owner.agreements.${label}`)}</span>
                <select
                  className="fx-input"
                  value={form[name]}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, [name]: event.target.value }))
                    setFormErrors((current) => ({ ...current, [name]: undefined }))
                  }}
                  aria-invalid={Boolean(formErrors[name])}
                >
                  <option value="">{translate('owner.agreements.choose')}</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                      {option.isActive ? '' : ` (${translate('owner.common.inactive')})`}
                    </option>
                  ))}
                </select>
                {formErrors[name] && <span className="fx-error-text">{translate(formErrors[name])}</span>}
              </label>
            ))}
          </div>
          <fieldset className="fx-field ow-fieldset">
            <legend className="fx-label">{translate('owner.agreements.services')}</legend>
            <ServiceChips
              services={data.services}
              selected={form.serviceIds}
              onToggle={(id) => {
                setForm((current) => ({ ...current, serviceIds: toggleIn(current.serviceIds, id) }))
                setFormErrors((current) => ({ ...current, serviceIds: undefined }))
              }}
            />
            {formErrors.serviceIds && <span className="fx-error-text">{translate(formErrors.serviceIds)}</span>}
          </fieldset>
          <div className="ow-actions">
            <button type="submit" className="fx-btn fx-btn--primary" disabled={busyId === 'new'}>
              {translate(busyId === 'new' ? 'owner.common.saving' : 'owner.common.save')}
            </button>
            <button
              type="button"
              className="fx-btn fx-btn--ghost"
              onClick={() => {
                setIsAdding(false)
                setForm(EMPTY_FORM)
                setFormErrors({})
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

      {!isLoading && !loadError && data.agreements.length === 0 && (
        <EmptyState
          icon={Handshake}
          title={translate('owner.agreements.empty')}
          message={translate(canCreate ? 'owner.agreements.emptyHint' : 'owner.agreements.needSetup')}
        />
      )}

      {!isLoading && !loadError && data.agreements.length > 0 && (
        <ul className="ow-list">
          {data.agreements.map((agreement) => {
            const isEditing = editingId === agreement.id
            return (
              <li key={agreement.id} className={`ow-card fx-card ${agreement.isActive ? '' : 'is-inactive'}`}>
                <div className="ow-card-head">
                  <span className="ow-card-icon" aria-hidden="true">
                    <Handshake size={20} />
                  </span>
                  <div className="ow-card-id">
                    <h2 className="ow-card-title">
                      <span className="ow-pair">
                        {agreement.compoundName}
                        <ArrowLeftRight size={15} aria-hidden="true" />
                        {agreement.companyName}
                      </span>
                      <span className={`fx-badge ${agreement.isActive ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
                        {translate(agreement.isActive ? 'owner.common.active' : 'owner.common.inactive')}
                      </span>
                    </h2>
                  </div>
                  {!isEditing && (
                    <div className="ow-card-tools">
                      <button
                        type="button"
                        className="fx-btn fx-btn--ghost fx-btn--sm"
                        onClick={() => {
                          setEditingId(agreement.id)
                          setEditServices(agreement.serviceIds)
                          setEditError('')
                        }}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        {translate('owner.agreements.editServices')}
                      </button>
                      <button
                        type="button"
                        className="fx-btn fx-btn--ghost fx-btn--sm"
                        onClick={() => toggleActive(agreement)}
                        disabled={busyId === agreement.id}
                      >
                        <Power size={14} aria-hidden="true" />
                        {translate(agreement.isActive ? 'owner.common.deactivate' : 'owner.common.activate')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="ow-partners">
                  <p className="ow-label">{translate('owner.agreements.services')}</p>
                  {isEditing ? (
                    <>
                      <ServiceChips
                        services={data.services}
                        selected={editServices}
                        onToggle={(id) => {
                          setEditServices((current) => toggleIn(current, id))
                          setEditError('')
                        }}
                      />
                      {editError && <span className="fx-error-text">{translate(editError)}</span>}
                      <div className="ow-actions">
                        <button
                          type="button"
                          className="fx-btn fx-btn--primary fx-btn--sm"
                          onClick={() => saveServices(agreement)}
                          disabled={busyId === agreement.id}
                        >
                          {translate(busyId === agreement.id ? 'owner.common.saving' : 'owner.common.save')}
                        </button>
                        <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => setEditingId(null)}>
                          {translate('owner.common.cancel')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <ul className="ow-chips">
                      {agreement.serviceIds.map((id) => (
                        <li key={id} className="fx-badge fx-badge--plain fx-badge--accent">
                          {serviceName(id)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default OwnerAgreements
