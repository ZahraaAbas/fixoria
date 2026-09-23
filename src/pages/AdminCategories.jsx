import { useEffect, useState } from 'react'
import { translate } from '../i18n'
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoriesService'
import { validateCategoryName } from '../utils/validators'
import './AdminCategories.css'

function AdminCategories() {
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

  return (
    <section>
      <h1>{translate('adminCategories.title')}</h1>

      <form className="admin-category-add" onSubmit={handleAdd}>
        <input
          type="text"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value)
            setNewNameError('')
          }}
          placeholder={translate('adminCategories.newPlaceholder')}
          aria-invalid={Boolean(newNameError)}
        />
        <button type="submit" className="admin-category-add-button" disabled={isAdding}>
          {translate(isAdding ? 'adminCategories.adding' : 'adminCategories.add')}
        </button>
      </form>
      {newNameError && <span className="admin-category-error">{translate(newNameError)}</span>}

      {isLoading && <p className="admin-categories-status">{translate('adminCategories.loading')}</p>}

      {!isLoading && error && (
        <div className="admin-categories-status">
          <p>{translate('adminCategories.error')}</p>
          <button type="button" className="admin-categories-retry" onClick={handleRetry}>
            {translate('adminCategories.retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <p className="admin-categories-status">{translate('adminCategories.empty')}</p>
      )}

      {!isLoading && !error && categories.length > 0 && (
        <ul className="admin-categories-list">
          {categories.map((category) => (
            <li key={category.id} className="admin-category-row">
              {editingId === category.id ? (
                <div className="admin-category-edit">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => {
                      setEditingName(event.target.value)
                      setEditingError('')
                    }}
                    aria-invalid={Boolean(editingError)}
                  />
                  {editingError && (
                    <span className="admin-category-error">{translate(editingError)}</span>
                  )}
                  <div className="admin-category-actions">
                    <button
                      type="button"
                      className="admin-category-save"
                      onClick={() => handleSaveEdit(category.id)}
                      disabled={actioningId === category.id}
                    >
                      {translate('adminCategories.save')}
                    </button>
                    <button
                      type="button"
                      className="admin-category-cancel"
                      onClick={cancelEditing}
                      disabled={actioningId === category.id}
                    >
                      {translate('adminCategories.cancelEdit')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="admin-category-name">{category.name}</span>

                  {confirmingDeleteId === category.id ? (
                    <div className="admin-category-confirm">
                      <span>{translate('adminCategories.confirmDelete')}</span>
                      <button
                        type="button"
                        className="admin-category-confirm-yes"
                        onClick={() => handleDelete(category.id)}
                        disabled={actioningId === category.id}
                      >
                        {translate('adminCategories.confirmYes')}
                      </button>
                      <button
                        type="button"
                        className="admin-category-confirm-no"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={actioningId === category.id}
                      >
                        {translate('adminCategories.confirmNo')}
                      </button>
                    </div>
                  ) : (
                    <div className="admin-category-actions">
                      <button
                        type="button"
                        className="admin-category-edit-button"
                        onClick={() => startEditing(category)}
                      >
                        {translate('adminCategories.edit')}
                      </button>
                      <button
                        type="button"
                        className="admin-category-delete-button"
                        onClick={() => setConfirmingDeleteId(category.id)}
                      >
                        {translate('adminCategories.delete')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminCategories