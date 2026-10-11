import { useState } from 'react'
import { CircleCheck, UserPlus } from 'lucide-react'
import { translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { assignRequest, getArtisanAccounts } from '../../services/adminService'
import ActionError from '../ui/ActionError'
import './Requests.css'

// المشرف يعيّن حرفي لطلب معلق: بس الحرفيين المفعّلين الي يقدمون نفس الخدمة (الخادم يتأكد من الاتفاقية)
function AssignArtisan({ request, onAssigned }) {
  const artisans = useLoader(getArtisanAccounts)
  const [artisanId, setArtisanId] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  if (request.status !== 'pending') return null

  const eligible = (artisans.data || []).filter(
    (a) => a.status === 'approved' && a.serviceIds.includes(request.serviceId) && a.id !== request.artisanId,
  )

  async function submit(event) {
    event.preventDefault()
    if (!artisanId) return
    setIsBusy(true)
    setError('')
    try {
      await assignRequest(request.id, artisanId)
      const chosen = eligible.find((a) => String(a.id) === artisanId)
      onAssigned({ artisanId: chosen.id, artisanName: chosen.fullName })
      setDone(chosen.fullName)
      setArtisanId('')
    } catch (err) {
      setError(err.status === 404 || err.status === 400 ? 'requestsTable.assignRejected' : 'common.actionError')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="rq-assign" aria-labelledby="rq-assign-title">
      <h3 id="rq-assign-title" className="rq-section-title">
        {translate(request.artisanId ? 'requestsTable.reassignTitle' : 'requestsTable.assignTitle')}
      </h3>
      <p className="rq-assign-note">
        {translate(request.artisanId ? 'requestsTable.reassignNote' : 'requestsTable.assignNote')}
      </p>

      {done && (
        <p className="flash" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          {translate('requestsTable.assigned').replace('{name}', done)}
        </p>
      )}

      {artisans.isLoading ? (
        <span className="fx-skeleton rq-assign-skeleton" />
      ) : eligible.length === 0 ? (
        <p className="rq-assign-empty">{translate('requestsTable.noEligible')}</p>
      ) : (
        <form className="rq-assign-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="rq-assign-select">
            {translate('requestsTable.chooseArtisan')}
          </label>
          <select
            id="rq-assign-select"
            className="fx-input"
            value={artisanId}
            onChange={(event) => setArtisanId(event.target.value)}
          >
            <option value="">{translate('requestsTable.chooseArtisan')}</option>
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
          <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={!artisanId || isBusy} data-loading={isBusy || undefined}>
            <UserPlus size={15} aria-hidden="true" />
            {translate('requestsTable.assign')}
          </button>
        </form>
      )}
      <ActionError messageKey={error} />
    </section>
  )
}

export default AssignArtisan
