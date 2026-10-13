import { useState } from 'react'
import { CircleCheck, Hourglass, UserPlus } from 'lucide-react'
import { translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { assignRequest, getArtisanAccounts } from '../../services/adminService'
import { parseApiDate } from '../../utils/formatDate'

// المشرف: حرفيو كل الشركات المتعاونة (status + serviceIds)
const ADMIN = {
  loader: getArtisanAccounts,
  assign: assignRequest,
  eligible: (a, request) => a.status === 'approved' && a.serviceIds.includes(request.serviceId),
}
import ActionError from '../ui/ActionError'
import './Requests.css'

// تعيين حرفي لطلب معلق (للمشرف أو لمدير الشركة حسب source): بس المفعّلين الي يقدمون نفس الخدمة،
// والخادم يتأكد من الاتفاقية والصلاحية
function AssignArtisan({ request, onAssigned, source = ADMIN }) {
  const artisans = useLoader(source.loader)
  const [artisanId, setArtisanId] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  // وقت فتح اللوحة — منه نحسب الدقائق الباقية لمهلة التوزيع
  const [openedAt] = useState(() => Date.now())

  if (request.status !== 'pending') return null

  const eligible = (artisans.data || []).filter((a) => source.eligible(a, request) && a.id !== request.artisanId)
  // وضع "الشركة توزّع": شكد باقي قبل ما الطلب ينفتح لحرفيي الشركة
  const minutesLeft =
    request.dispatchDeadline && !request.artisanId
      ? Math.ceil((parseApiDate(request.dispatchDeadline).getTime() - openedAt) / 60000)
      : null

  async function submit(event) {
    event.preventDefault()
    if (!artisanId) return
    setIsBusy(true)
    setError('')
    try {
      await source.assign(request.id, artisanId)
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
      {minutesLeft != null && (
        <p className="rq-assign-deadline">
          <Hourglass size={14} aria-hidden="true" />
          {minutesLeft > 0
            ? translate('dispatch.minutesLeft').replace('{n}', minutesLeft)
            : translate('dispatch.windowOver')}
        </p>
      )}

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
