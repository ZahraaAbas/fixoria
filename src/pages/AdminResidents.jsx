import { useEffect, useState } from 'react'
import { Building2, Check, Mail, Phone, Users, X } from 'lucide-react'
import { translate } from '../i18n'
import { getResidents, setResidentMembership } from '../services/adminService'
import { ErrorState, EmptyState, SkeletonList } from '../components/StatusState'
import PageHeader from '../components/ui/PageHeader'
import ActionError from '../components/ui/ActionError'
import ConfirmDialog from '../components/dashboard/ConfirmDialog'
import './Owner.css'
import './AdminRequests.css'

const FILTERS = ['pending', 'approved', 'rejected']
const BADGE = { pending: 'fx-badge--pending', approved: 'fx-badge--completed', rejected: 'fx-badge--rejected' }

// سكان المجمع: موافقة/رفض طلبات الانضمام
function AdminResidents() {
  const [residents, setResidents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isCancelled = false
    getResidents()
      .then((data) => {
        if (isCancelled) return
        setResidents(data)
        // إذا ماكو منتظرين نفتح على المقبولين بدل قائمة فارغة
        if (!data.some((r) => r.membershipStatus === 'pending')) setFilter('approved')
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

  // الرفض يحتاج تأكيد لأن الساكن يفقد الوصول لطلب الخدمات
  const [confirmReject, setConfirmReject] = useState(null)

  async function decide(resident, status) {
    setBusyId(resident.id)
    setActionError('')
    try {
      const updated = await setResidentMembership(resident.id, status)
      setResidents((list) => list.map((r) => (r.id === updated.id ? updated : r)))
      setConfirmReject(null)
    } catch (error) {
      setActionError(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
    } finally {
      setBusyId(null)
    }
  }

  const counts = Object.fromEntries(FILTERS.map((f) => [f, residents.filter((r) => r.membershipStatus === f).length]))
  const visible = residents.filter((r) => r.membershipStatus === filter)

  return (
    <section className="ow">
      <PageHeader title={translate('adminResidents.title')} meta={translate('adminResidents.subtitle')} />

      {!isLoading && !loadError && (
        <div className="arq-filters" role="tablist" aria-label={translate('adminResidents.title')}>
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={`arq-filter ${filter === key ? 'is-active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {filter === key && <span className="arq-filter-pill" />}
              {translate(`adminResidents.${key}`)}
              <span className="arq-filter-count">{counts[key]}</span>
            </button>
          ))}
        </div>
      )}

      <ActionError messageKey={actionError} className="ow-error" />

      {isLoading && <SkeletonList count={3} />}

      {!isLoading && loadError && (
        <ErrorState
          message={translate('adminResidents.loadError')}
          onRetry={() => {
            setIsLoading(true)
            setLoadError(null)
            setAttempt((n) => n + 1)
          }}
          retryLabel={translate('adminResidents.retry')}
        />
      )}

      {!isLoading && !loadError && visible.length === 0 && (
        <EmptyState icon={Users} title={translate(`adminResidents.empty.${filter}`)} />
      )}

      {!isLoading && !loadError && visible.length > 0 && (
        <ul className="ow-list">
          {visible.map((resident) => (
            <li key={resident.id} className="ow-card fx-card">
              <div className="ow-card-head">
                <span className="ow-card-icon" aria-hidden="true">
                  {resident.name.trim().charAt(0)}
                </span>
                <div className="ow-card-id">
                  <h2 className="ow-card-title">
                    {resident.name}
                    <span className={`fx-badge ${BADGE[resident.membershipStatus]}`}>
                      {translate(`adminResidents.${resident.membershipStatus}`)}
                    </span>
                  </h2>
                  <p className="ow-card-meta">
                    <span dir="ltr">
                      <Mail size={12} aria-hidden="true" />
                      {resident.email}
                    </span>
                    {resident.phone && (
                      <span dir="ltr">
                        <Phone size={12} aria-hidden="true" />
                        {resident.phone}
                      </span>
                    )}
                    {(resident.building || resident.apartment) && (
                      <span>
                        <Building2 size={12} aria-hidden="true" />
                        {[resident.building, resident.floor && `${translate('adminResidents.floor')} ${resident.floor}`, resident.apartment]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="ow-card-tools">
                  {resident.membershipStatus !== 'approved' && (
                    <button
                      type="button"
                      className="fx-btn fx-btn--primary fx-btn--sm"
                      onClick={() => decide(resident, 'approved')}
                      disabled={busyId === resident.id}
                    >
                      <Check size={14} aria-hidden="true" />
                      {translate('adminResidents.approve')}
                    </button>
                  )}
                  {resident.membershipStatus !== 'rejected' && (
                    <button
                      type="button"
                      className="fx-btn fx-btn--ghost fx-btn--sm"
                      onClick={() => setConfirmReject(resident)}
                      disabled={busyId === resident.id}
                    >
                      <X size={14} aria-hidden="true" />
                      {translate('adminResidents.reject')}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirmReject)}
        title={translate('adminWorkspace.rejectResidentTitle')}
        message={translate('adminWorkspace.rejectResidentMessage').replace('{name}', confirmReject?.name || '')}
        confirmLabel={translate('adminResidents.reject')}
        onConfirm={() => decide(confirmReject, 'rejected')}
        onCancel={() => setConfirmReject(null)}
        isBusy={busyId === confirmReject?.id}
      />
    </section>
  )
}

export default AdminResidents
