import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { getPaymentProviders, updateCompound } from '../../services/ownerService'
import ActionError from '../ui/ActionError'
import './CompoundPayments.css'

// إعدادات الدفع الأونلاين لمجمع: البوابة (حساب تاجر المجمع) والتفعيل.
// ما ينفعّل إلا إذا البوابة مربوطة بالخادم (مفاتيحها موجودة).
function CompoundPayments({ compound, onUpdated }) {
  const providers = useLoader(getPaymentProviders)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const list = providers.data || []
  const current = list.find((p) => p.name === compound.paymentProvider)
  const canEnable = Boolean(current?.available)

  async function save(changes) {
    setBusy(true)
    setError('')
    try {
      onUpdated(await updateCompound(compound.id, changes))
    } catch {
      setError('ownerPayments.saveError')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cpay">
      <div className="cpay-head">
        <p className="ow-label">
          <CreditCard size={13} aria-hidden="true" />
          {translate('ownerPayments.title')}
        </p>
        <span className={`fx-badge ${compound.onlinePaymentsEnabled ? 'fx-badge--completed' : 'fx-badge--cancelled'}`}>
          {translate(compound.onlinePaymentsEnabled ? 'ownerPayments.on' : 'ownerPayments.off')}
        </span>
      </div>

      <div className="cpay-row">
        <label className="cpay-field">
          <span className="sr-only">{translate('ownerPayments.provider')}</span>
          <select
            className="fx-input"
            value={compound.paymentProvider}
            disabled={busy || providers.isLoading}
            onChange={(event) => save({ paymentProvider: event.target.value })}
            aria-label={translate('ownerPayments.provider')}
          >
            <option value="">{translate('ownerPayments.noProvider')}</option>
            {list.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
                {p.available ? '' : ` — ${translate('ownerPayments.notConnected')}`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`fx-btn fx-btn--sm ${compound.onlinePaymentsEnabled ? 'fx-btn--ghost' : 'fx-btn--primary'}`}
          disabled={busy || (!compound.onlinePaymentsEnabled && !canEnable)}
          onClick={() => save({ onlinePaymentsEnabled: !compound.onlinePaymentsEnabled })}
          data-loading={busy || undefined}
        >
          {translate(compound.onlinePaymentsEnabled ? 'ownerPayments.disable' : 'ownerPayments.enable')}
        </button>
      </div>

      <p className="cpay-note">
        {compound.paymentProvider && !canEnable
          ? translate('ownerPayments.needsKeys')
          : compound.paymentProvider === 'sandbox'
            ? translate('ownerPayments.sandboxNote')
            : translate('ownerPayments.note')}
      </p>
      <ActionError messageKey={error} />
    </div>
  )
}

export default CompoundPayments
