import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Banknote, CircleCheck, CreditCard, Download, Hourglass, ShieldCheck, Wallet } from 'lucide-react'
import { translate } from '../../i18n'
import { downloadInvoice, payResidentRequest, startOnlinePayment } from '../../services/requestsService'
import { formatDateTime } from '../../utils/formatDate'
import { formatIQD } from '../../utils/money'
import ActionError from '../ui/ActionError'
import './Payments.css'

// الدفع للطلب المكتمل: كاش (بانتظار تأكيد الحرفي)، أو أونلاين عبر بوابة المجمع إذا مفعّلة،
// وإذا مو مفعّلة تبقى البطاقة التجريبية
function PaymentCard({ request, onUpdated }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const isPaid = request.paymentStatus === 'paid'
  const waitingCash = !isPaid && request.paymentMethod === 'cash'
  const online = Boolean(request.onlinePaymentAvailable)

  // نروح لصفحة الدفع عند البوابة (بوابة التجربة صفحتها داخل الموقع)؛ الطلب ينعلّم مدفوع بس لمن البوابة تأكد
  async function payOnline() {
    setBusy('online')
    setError('')
    try {
      const payment = await startOnlinePayment(request.id)
      if (payment.checkoutUrl?.startsWith('/')) navigate(payment.checkoutUrl)
      else window.location.assign(payment.checkoutUrl)
    } catch (err) {
      setError(err.message === 'NETWORK_ERROR' ? 'common.networkError' : 'onlinePay.startError')
      setBusy(null)
    }
  }

  async function pay(method) {
    setBusy(method)
    setError('')
    try {
      onUpdated(await payResidentRequest(request.id, method))
    } catch (err) {
      setError(err.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
    } finally {
      setBusy(null)
    }
  }

  async function invoice() {
    setBusy('invoice')
    setError('')
    try {
      await downloadInvoice(request.id)
    } catch (err) {
      setError(err.message === 'NETWORK_ERROR' ? 'common.networkError' : 'common.actionError')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rd-card fx-card pay-card">
      <div className="pay-head">
        <h2 className="rd-card-title">
          <Wallet size={18} aria-hidden="true" />
          {translate('payments.title')}
        </h2>
        {!online && <span className="pay-demo">{translate('payments.demoBadge')}</span>}
      </div>

      {request.price == null ? (
        <p className="fx-notice fx-notice--muted">{translate('payments.noPrice')}</p>
      ) : (
        <>
          <p className="pay-amount">{formatIQD(request.price)}</p>

          {isPaid && (
            <p className="fx-notice fx-notice--success">
              <CircleCheck size={18} aria-hidden="true" />
              {translate('payments.paid')}
              {request.paymentMethod && ` — ${translate(`payments.method.${request.paymentMethod}`)}`}
              {request.paidAt && ` · ${formatDateTime(request.paidAt)}`}
            </p>
          )}

          {waitingCash && (
            <p className="fx-notice fx-notice--muted">
              <Hourglass size={18} aria-hidden="true" />
              {translate('payments.waitingCash')}
            </p>
          )}

          {!isPaid && (
            <div className="pay-actions">
              {!waitingCash && (
                <button type="button" className="fx-btn fx-btn--secondary" onClick={() => pay('cash')} disabled={Boolean(busy)}>
                  <Banknote size={16} aria-hidden="true" />
                  {translate('payments.payCash')}
                </button>
              )}
              {online ? (
                <button
                  type="button"
                  className="fx-btn fx-btn--primary"
                  onClick={payOnline}
                  disabled={Boolean(busy)}
                  data-loading={busy === 'online' || undefined}
                >
                  <ShieldCheck size={16} aria-hidden="true" />
                  {translate(request.pendingPaymentId ? 'onlinePay.continue' : 'onlinePay.payOnline')}
                </button>
              ) : (
                <button type="button" className="fx-btn fx-btn--primary" onClick={() => pay('card_demo')} disabled={Boolean(busy)}>
                  <CreditCard size={16} aria-hidden="true" />
                  {translate('payments.payCardDemo')}
                </button>
              )}
            </div>
          )}
          {!isPaid && <p className="pay-note">{translate(online ? 'onlinePay.note' : 'payments.demoNote')}</p>}
        </>
      )}

      <ActionError messageKey={error} />

      <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm pay-invoice" onClick={invoice} disabled={busy === 'invoice'}>
        <Download size={15} aria-hidden="true" />
        {translate('payments.invoice')}
      </button>
    </section>
  )
}

export default PaymentCard
