import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CircleCheck, CircleX, Clock3, Loader2 } from 'lucide-react'
import { translate } from '../i18n'
import { getOnlinePayment } from '../services/requestsService'
import { formatIQD } from '../utils/money'
import './PaymentPages.css'

const POLL_MS = 2000
const MAX_POLLS = 15

// بعد الرجوع من بوابة الدفع: الخادم يسأل البوابة عن الحالة، وإحنا نعيد السؤال شوية إذا بعدها معلّقة
function PaymentReturn() {
  const { attemptId } = useParams()
  const [payment, setPayment] = useState(null)
  const [failed, setFailed] = useState(false)
  const [polls, setPolls] = useState(0)

  useEffect(() => {
    let isCancelled = false
    let timer = null
    async function check(count) {
      try {
        const result = await getOnlinePayment(attemptId)
        if (isCancelled) return
        setPayment(result)
        setPolls(count)
        if (result.status === 'pending' && count < MAX_POLLS) timer = setTimeout(() => check(count + 1), POLL_MS)
      } catch {
        if (!isCancelled) setFailed(true)
      }
    }
    check(1)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [attemptId])

  const status = payment?.status
  const stillChecking = !failed && (!payment || (status === 'pending' && polls < MAX_POLLS))
  const view = failed
    ? { Icon: CircleX, tone: 'bad', title: 'onlinePay.loadError' }
    : stillChecking
      ? { Icon: Loader2, tone: 'wait', title: 'onlinePay.checking' }
      : status === 'paid'
        ? { Icon: CircleCheck, tone: 'good', title: 'onlinePay.paid' }
        : status === 'pending'
          ? { Icon: Clock3, tone: 'wait', title: 'onlinePay.stillPending' }
          : { Icon: CircleX, tone: 'bad', title: `onlinePay.result.${status}` }

  return (
    <section className="pay-page">
      <div className={`pay-result pay-result--${view.tone} fx-card`} role="status" aria-live="polite">
        <span className="pay-result-icon" aria-hidden="true">
          <view.Icon size={30} className={stillChecking ? 'pay-spin' : ''} />
        </span>
        <h1 className="pay-result-title">{translate(view.title)}</h1>
        {payment && <p className="pay-result-amount">{formatIQD(payment.amount)}</p>}
        {!stillChecking && status && status !== 'paid' && status !== 'pending' && (
          <p className="pay-result-note">{translate('onlinePay.tryAgainNote')}</p>
        )}
        {payment && (
          <Link to={`/my-requests/${payment.requestId}`} className="fx-btn fx-btn--primary">
            {translate('onlinePay.backToRequest')}
          </Link>
        )}
      </div>
    </section>
  )
}

export default PaymentReturn
