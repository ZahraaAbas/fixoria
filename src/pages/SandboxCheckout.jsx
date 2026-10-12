import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CircleCheck, CircleX, FlaskConical, Undo2 } from 'lucide-react'
import { translate } from '../i18n'
import { useLoader } from '../hooks/useLoader'
import { decideSandboxPayment, getSandboxCheckout } from '../services/requestsService'
import { formatIQD } from '../utils/money'
import { ErrorState, SkeletonList } from '../components/StatusState'
import ActionError from '../components/ui/ActionError'
import './PaymentPages.css'

// صفحة "بوابة التجربة": تمثّل صفحة شركة الدفع. ما تطلب بيانات بطاقة وما تحرّك فلوس.
function SandboxCheckout() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const load = useCallback(() => getSandboxCheckout(ref), [ref])
  const { data, error, isLoading, retry } = useLoader(load)
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState('')

  async function decide(outcome) {
    setBusy(outcome)
    setActionError('')
    try {
      const payment = await decideSandboxPayment(ref, outcome)
      navigate(`/payments/${payment.id}`, { replace: true })
    } catch {
      setActionError('common.actionError')
      setBusy(null)
    }
  }

  return (
    <section className="pay-page">
      <div className="pay-gateway fx-card">
        <p className="pay-gateway-badge">
          <FlaskConical size={15} aria-hidden="true" />
          {translate('onlinePay.sandboxBadge')}
        </p>

        {isLoading && <SkeletonList count={1} />}
        {error && <ErrorState message={translate('onlinePay.notFound')} onRetry={retry} retryLabel={translate('owner.common.retry')} />}

        {data && (
          <>
            <h1 className="pay-gateway-title">{translate('onlinePay.sandboxTitle')}</h1>
            <dl className="pay-gateway-rows">
              <div>
                <dt>{translate('onlinePay.merchant')}</dt>
                <dd>{data.compoundName || '—'}</dd>
              </div>
              <div>
                <dt>{translate('onlinePay.forRequest')}</dt>
                <dd>
                  #{data.requestId} {data.requestTitle}
                </dd>
              </div>
              <div className="pay-gateway-amount">
                <dt>{translate('onlinePay.amount')}</dt>
                <dd>{formatIQD(data.amount)}</dd>
              </div>
            </dl>

            {data.status === 'pending' ? (
              <>
                <p className="pay-gateway-note">{translate('onlinePay.sandboxNote')}</p>
                <div className="pay-gateway-actions">
                  <button type="button" className="fx-btn fx-btn--primary" disabled={Boolean(busy)} data-loading={busy === 'succeeded' || undefined} onClick={() => decide('succeeded')}>
                    <CircleCheck size={16} aria-hidden="true" />
                    {translate('onlinePay.simulateSuccess')}
                  </button>
                  <button type="button" className="fx-btn fx-btn--secondary" disabled={Boolean(busy)} data-loading={busy === 'declined' || undefined} onClick={() => decide('declined')}>
                    <CircleX size={16} aria-hidden="true" />
                    {translate('onlinePay.simulateDecline')}
                  </button>
                  <button type="button" className="fx-btn fx-btn--ghost" disabled={Boolean(busy)} onClick={() => decide('cancelled')}>
                    <Undo2 size={16} aria-hidden="true" />
                    {translate('onlinePay.cancel')}
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="fx-btn fx-btn--secondary" onClick={() => navigate(`/payments/${data.attemptId}`, { replace: true })}>
                {translate('onlinePay.seeResult')}
              </button>
            )}
            <ActionError messageKey={actionError} />
          </>
        )}
      </div>
    </section>
  )
}

export default SandboxCheckout
