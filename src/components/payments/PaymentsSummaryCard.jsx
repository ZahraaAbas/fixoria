import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { getCurrentLanguage, translate } from '../../i18n'
import { formatIQD } from '../../utils/money'
import './Payments.css'

// ملخص مدفوعات الشهر (تجريبي) — loader يرجّع ملخص المجمع أو الشركة
function PaymentsSummaryCard({ loader }) {
  const [summary, setSummary] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let isCancelled = false
    loader()
      .then((data) => {
        if (!isCancelled) setSummary(data)
      })
      .catch(() => {
        if (!isCancelled) setFailed(true)
      })
    return () => {
      isCancelled = true
    }
  }, [loader])

  if (failed) return null

  const monthLabel = summary
    ? new Date(`${summary.month}-01T00:00:00`).toLocaleDateString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', {
        month: 'long',
        year: 'numeric',
      })
    : ''
  const rows = summary && [
    { key: 'paid', value: summary.paid, tone: 'success' },
    { key: 'unpaid', value: summary.unpaid, tone: 'danger' },
    { key: 'cash', value: summary.cash },
    { key: 'online', value: summary.online },
    { key: 'cardDemo', value: summary.cardDemo },
  ]

  return (
    <section className="fx-card pay-summary" aria-busy={!summary}>
      <div className="pay-head">
        <h2 className="pay-summary-title">
          <Wallet size={18} aria-hidden="true" />
          {translate('payments.summaryTitle')}
          {monthLabel && <span className="pay-summary-month">{monthLabel}</span>}
        </h2>
        <span className="pay-demo">{translate('payments.demoBadge')}</span>
      </div>

      {!summary ? (
        <div className="fx-skeleton pay-summary-skeleton" />
      ) : (
        <>
          <p className="pay-amount">{formatIQD(summary.total)}</p>
          <p className="pay-note">
            {translate('payments.completedCount').replace('{n}', summary.completed)}
            {summary.unpriced > 0 && ` · ${translate('payments.unpriced').replace('{n}', summary.unpriced)}`}
          </p>
          <dl className="pay-summary-grid">
            {rows.map(({ key, value, tone }) => (
              <div key={key} className={tone ? `is-${tone}` : ''}>
                <dt>{translate(`payments.${key}Label`)}</dt>
                <dd>{formatIQD(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  )
}

export default PaymentsSummaryCard
