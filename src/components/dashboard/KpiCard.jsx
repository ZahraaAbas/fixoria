import { Link } from 'react-router'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { translate } from '../../i18n'
import './Dashboard.css'

// بطاقة رقم: القيمة + تعريفها + التغيير عن الفترة السابقة (بس إذا محسوب فعلًا) + رابط للتفاصيل
function KpiCard({ Icon, label, value, definition, delta, previous, deltaGood = 'up', to, tone = 'default' }) {
  const hasDelta = delta != null
  const direction = !hasDelta ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const isGood = direction === 'flat' ? null : direction === deltaGood
  const DeltaIcon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  const Wrapper = to ? Link : 'div'

  return (
    <Wrapper {...(to ? { to } : {})} className={`kpi fx-card kpi--${tone} ${to ? 'kpi--link' : ''}`}>
      <div className="kpi-head">
        <span className="kpi-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <p className="kpi-value">{value ?? '—'}</p>
      <div className="kpi-foot">
        {hasDelta ? (
          <span className={`kpi-delta ${isGood == null ? '' : isGood ? 'is-good' : 'is-bad'}`}>
            <DeltaIcon size={14} aria-hidden="true" />
            {`${delta > 0 ? '+' : ''}${delta}%`}
            <span className="kpi-delta-note">{translate('analytics.vsPrevious')}</span>
          </span>
        ) : (
          previous != null && (
            <span className="kpi-delta">
              {translate('analytics.previousValue').replace('{n}', previous)}
            </span>
          )
        )}
      </div>
      {definition && <p className="kpi-definition">{definition}</p>}
    </Wrapper>
  )
}

export default KpiCard
