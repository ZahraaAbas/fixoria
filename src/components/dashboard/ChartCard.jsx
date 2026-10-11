import { BarChart3 } from 'lucide-react'
import { translate } from '../../i18n'
import './Dashboard.css'

// إطار موحّد للرسوم والأقسام: عنوان + سؤال يجاوبه + أدوات + حالة فاضية بدل رسم مضلّل
function ChartCard({ id, title, subtitle, actions, isEmpty, emptyText, children, className = '' }) {
  return (
    <section className={`chart-card fx-card ${className}`} aria-labelledby={id}>
      <header className="chart-card-head">
        <div>
          <h2 id={id} className="chart-card-title">
            {title}
          </h2>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="chart-card-actions">{actions}</div>}
      </header>
      {isEmpty ? (
        <div className="chart-card-empty">
          <BarChart3 size={22} aria-hidden="true" />
          <p>{emptyText || translate('analytics.noData')}</p>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

export default ChartCard
