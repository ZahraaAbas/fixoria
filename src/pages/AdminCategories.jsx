import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, Check, LayoutGrid, Pencil, Plus, Trash2, X } from 'lucide-react'
import { translate } from '../i18n'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoriesService'
import { validateCategoryName } from '../utils/validators'
import { serviceVisuals, defaultServiceVisual } from '../config/serviceVisuals'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import { easeOut, spring } from '../components/ui/motion'
import './AdminCategories.css'

function AdminCategories() {
  const reduceMotion = useReducedMotion()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [newName, setNewName] = useState('')
  const [newNameError, setNewNameError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingError, setEditingError] = useState('')

  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)
  const [actioningId, setActioningId] = useState(null)

  useEffect(() => {
    let isCancelled = false

    getCategories()
      .then((data) => {
        if (!isCancelled) setCategories(data)
      })
      .catch((err) => {
        if (!isCancelled) setError(err)
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
    setError(null)
    setAttempt((count) => count + 1)
  }

  async function handleAdd(event) {
    event.preventDefault()
    const validationError = validateCategoryName(newName)
    setNewNameError(validationError)
    if (validationError) return

    setIsAdding(true)
    const created = await addCategory(newName.trim())
    setCategories((current) => [...current, created])
    setNewName('')
    setIsAdding(false)
  }

  function startEditing(category) {
    setEditingId(category.id)
    setEditingName(category.name)
    setEditingError('')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingName('')
    setEditingError('')
  }

  async function handleSaveEdit(id) {
    const validationError = validateCategoryName(editingName)
    setEditingError(validationError)
    if (validationError) return

    setActioningId(id)
    const updated = await updateCategory(id, editingName.trim())
    setCategories((current) =>
      current.map((category) => (category.id === id ? updated : category)),
    )
    setActioningId(null)
    cancelEditing()
  }

  async function handleDelete(id) {
    setActioningId(id)
    await deleteCategory(id)
    setCategories((current) => current.filter((category) => category.id !== id))
    setActioningId(null)
    setConfirmingDeleteId(null)
  }

  const swap = {
    initial: reduceMotion ? false : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? undefined : { opacity: 0, y: -6 },
    transition: { duration: 0.2, ease: easeOut },
  }

  return (
    <section>
      <PageHeader
        title={translate('adminCategories.title')}
        meta={
          !isLoading && !error ? (
            <span className="ac-count">
              <LayoutGrid size={15} aria-hidden="true" />
              {categories.length}
            </span>
          ) : null
        }
      />

      <form className="ac-add fx-card" onSubmit={handleAdd}>
        <span className="ac-add-icon" aria-hidden="true">
          <Plus size={20} />
        </span>
        <div className="ac-add-field">
          <input
            className="fx-input"
            type="text"
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value)
              setNewNameError('')
            }}
            placeholder={translate('adminCategories.newPlaceholder')}
            aria-label={translate('adminCategories.newPlaceholder')}
            aria-invalid={Boolean(newNameError)}
          />
          {newNameError && <span className="fx-error-text">{translate(newNameError)}</span>}
        </div>
        <button type="submit" className="fx-btn fx-btn--primary" disabled={isAdding}>
          {translate(isAdding ? 'adminCategories.adding' : 'adminCategories.add')}
        </button>
      </form>

      {isLoading && (
        <>
          <p className="sr-only" role="status">
            {translate('adminCategories.loading')}
          </p>
          <SkeletonList count={6} variant="grid" />
        </>
      )}

      {!isLoading && error && (
        <ErrorState
          message={translate('adminCategories.error')}
          onRetry={handleRetry}
          retryLabel={translate('adminCategories.retry')}
        />
      )}

      {!isLoading && !error && categories.length === 0 && (
        <EmptyState icon={LayoutGrid} title={translate('adminCategories.empty')} />
      )}

      {!isLoading && !error && categories.length > 0 && (
        <ul className="ac-grid">
          <AnimatePresence initial={false} mode="popLayout">
            {categories.map((category) => {
              const { Icon, gradient } = serviceVisuals[category.icon] || defaultServiceVisual
              const isEditing = editingId === category.id
              const isConfirming = confirmingDeleteId === category.id
              const isBusy = actioningId === category.id
              return (
                <motion.li
                  key={category.id}
                  layout={!reduceMotion}
                  transition={spring}
                  className={`ac-tile fx-card ${isConfirming ? 'is-danger' : ''} ${isEditing ? 'is-editing' : ''}`}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
                >
                  <span className="ac-tile-icon" style={{ background: gradient }} aria-hidden="true">
                    <Icon size={20} />
                  </span>

                  <AnimatePresence mode="wait" initial={false}>
                    {isEditing ? (
                      <motion.div key="edit" className="ac-tile-body" {...swap}>
                        <input
                          className="fx-input ac-edit-input"
                          type="text"
                          value={editingName}
                          onChange={(event) => {
                            setEditingName(event.target.value)
                            setEditingError('')
                          }}
                          aria-label={translate('adminCategories.edit')}
                          aria-invalid={Boolean(editingError)}
                          autoFocus
                        />
                        {editingError && <span className="fx-error-text">{translate(editingError)}</span>}
                        <div className="ac-tile-actions">
                          <button
                            type="button"
                            className="fx-btn fx-btn--primary fx-btn--sm"
                            onClick={() => handleSaveEdit(category.id)}
                            disabled={isBusy}
                          >
                            <Check size={14} aria-hidden="true" />
                            {translate('adminCategories.save')}
                          </button>
                          <button
                            type="button"
                            className="fx-btn fx-btn--ghost fx-btn--sm"
                            onClick={cancelEditing}
                            disabled={isBusy}
                          >
                            {translate('adminCategories.cancelEdit')}
                          </button>
                        </div>
                      </motion.div>
                    ) : isConfirming ? (
                      <motion.div key="confirm" className="ac-tile-body" role="alertdialog" aria-label={translate('adminCategories.confirmDelete')} {...swap}>
                        <p className="ac-confirm-text">
                          <AlertTriangle size={16} aria-hidden="true" />
                          {translate('adminCategories.confirmDelete')}
                        </p>
                        <div className="ac-tile-actions">
                          <button
                            type="button"
                            className="fx-btn fx-btn--sm ac-delete-yes"
                            onClick={() => handleDelete(category.id)}
                            disabled={isBusy}
                          >
                            {translate('adminCategories.confirmYes')}
                          </button>
                          <button
                            type="button"
                            className="fx-btn fx-btn--secondary fx-btn--sm"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={isBusy}
                          >
                            {translate('adminCategories.confirmNo')}
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="view" className="ac-tile-body ac-tile-body--view" {...swap}>
                        <span className="ac-tile-name">{category.name}</span>
                        <div className="ac-tile-tools">
                          <button
                            type="button"
                            className="ac-tool"
                            onClick={() => startEditing(category)}
                            aria-label={`${translate('adminCategories.edit')}: ${category.name}`}
                            title={translate('adminCategories.edit')}
                          >
                            <Pencil size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ac-tool ac-tool--danger"
                            onClick={() => setConfirmingDeleteId(category.id)}
                            aria-label={`${translate('adminCategories.delete')}: ${category.name}`}
                            title={translate('adminCategories.delete')}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isConfirming && (
                    <button
                      type="button"
                      className="ac-dismiss"
                      onClick={() => setConfirmingDeleteId(null)}
                      aria-label={translate('adminCategories.confirmNo')}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

export default AdminCategories
