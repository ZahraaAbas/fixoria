import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { translate } from '../../i18n'
import { easeOut } from '../ui/motion'
import './Dashboard.css'

// ترتيب أفقي: رقم الترتيب مكتوب (مو بس اللون)، العدد، الحصة، والتغيير عن الفترة السابقة.
// كل صف رابط للطلبات الي وراه.
function RankedBars({ items, limit, linkFor, showStatus = false, ranked = true }) {
  const reduceMotion = useReducedMotion()
  const shown = limit ? items.slice(0, limit) : items
  const max = Math.max(...shown.map((item) => item.count), 1)

  return (
    <ol className="rb">
      {shown.map((item, index) => {
        const width = `${Math.max((item.count / max) * 100, item.count ? 4 : 0)}%`
        const content = (
          <>
            {ranked && <span className={`rb-rank ${index === 0 && item.count > 0 ? 'is-top' : ''}`}>{index + 1}</span>}
            <span className="rb-main">
              <span className="rb-line">
                <span className="rb-name">{item.name}</span>
                <span className="rb-numbers">
                  <strong>{item.count}</strong>
                  {item.share != null && <span className="rb-share">{item.share}%</span>}
                  {item.change != null && item.change !== 0 && (
                    <span className={`rb-change ${item.change > 0 ? 'is-up' : 'is-down'}`}>
                      {item.change > 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                      {Math.abs(item.change)}%
                      <span className="sr-only">{translate('analytics.vsPrevious')}</span>
                    </span>
                  )}
                </span>
              </span>
              <span className="rb-track" aria-hidden="true">
                <motion.span
                  className="rb-fill"
                  initial={reduceMotion ? false : { width: 0 }}
                  animate={{ width }}
                  transition={{ duration: 0.6, ease: easeOut, delay: reduceMotion ? 0 : index * 0.05 }}
                />
              </span>
              {showStatus && item.count > 0 && (
                <span className="rb-status">
                  {translate('analytics.statusLine')
                    .replace('{completed}', item.completed)
                    .replace('{active}', item.statuses.accepted + item.statuses.in_progress)
                    .replace('{pending}', item.statuses.pending)
                    .replace('{cancelled}', item.cancelled)}
                </span>
              )}
            </span>
          </>
        )
        const href = linkFor?.(item)
        return (
          <li key={item.key ?? item.serviceId ?? item.name}>
            {href ? (
              <Link to={href} className="rb-row rb-row--link">
                {content}
              </Link>
            ) : (
              <div className="rb-row">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default RankedBars
