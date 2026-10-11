import { Link } from 'react-router'
import { Lightbulb, TriangleAlert } from 'lucide-react'
import { translate } from '../../i18n'
import { requestsLink } from '../../analytics/useRange'
import './Dashboard.css'

const fill = (key, values) =>
  Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), translate(key))

// ملاحظات محسوبة من الأرقام (buildInsights) — كل وحدة بيها رابط للطلبات الي وراها
function InsightsList({ insights, range, base }) {
  if (insights.length === 0) return null
  return (
    <ul className="insights">
      {insights.map((insight) => (
        <li key={insight.key} className={`insight ${insight.tone === 'warning' ? 'insight--warning' : ''}`}>
          {insight.tone === 'warning' ? <TriangleAlert size={16} aria-hidden="true" /> : <Lightbulb size={16} aria-hidden="true" />}
          <span>{fill(`analytics.insights.${insight.key}`, insight.params)}</span>
          {insight.filter && (
            <Link to={requestsLink(base, range, insight.filter)} className="insight-link">
              {translate('analytics.viewRequests')}
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}

export default InsightsList
