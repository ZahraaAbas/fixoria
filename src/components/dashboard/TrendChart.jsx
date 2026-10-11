import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from 'motion/react'
import { getCurrentLanguage, translate } from '../../i18n'
import './Dashboard.css'

const COLORS = { created: '#f19035', completed: '#263056' }

function formatBucket(date, step) {
  const label = date.toLocaleDateString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', { day: 'numeric', month: 'short' })
  return step > 1 ? translate('analytics.weekOf').replace('{date}', label) : label
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <span className="chart-tip-label">{label}</span>
      {payload.map((item) => (
        <span key={item.dataKey} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background: COLORS[item.dataKey] }} aria-hidden="true" />
          {translate(`analytics.series.${item.dataKey}`)}
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  )
}

// الطلبات الجديدة مقابل المكتملة عبر الفترة (يومي أو أسبوعي)
function TrendChart({ series }) {
  const reduceMotion = useReducedMotion()
  const isRtl = getCurrentLanguage() !== 'en'
  const data = series.buckets.map((b) => ({ label: formatBucket(b.start, series.step), created: b.created, completed: b.completed }))

  return (
    <>
      <div className="trend-chart">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trendCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.created} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLORS.created} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="trendCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.completed} stopOpacity={0.22} />
                <stop offset="100%" stopColor={COLORS.completed} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#eadcd6" />
            <XAxis
              dataKey="label"
              reversed={isRtl}
              stroke="#8f6c60"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              orientation={isRtl ? 'right' : 'left'}
              allowDecimals={false}
              stroke="#8f6c60"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip content={<TrendTooltip />} />
            <Legend
              verticalAlign="top"
              align={isRtl ? 'right' : 'left'}
              height={28}
              iconType="circle"
              formatter={(key) => <span className="trend-legend">{translate(`analytics.series.${key}`)}</span>}
            />
            <Area
              type="monotone"
              dataKey="created"
              stroke={COLORS.created}
              strokeWidth={2.5}
              fill="url(#trendCreated)"
              isAnimationActive={!reduceMotion}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke={COLORS.completed}
              strokeWidth={2}
              fill="url(#trendCompleted)"
              isAnimationActive={!reduceMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* نفس البيانات كجدول لقارئ الشاشة */}
      <table className="sr-only">
        <caption>{translate('analytics.trendTitle')}</caption>
        <thead>
          <tr>
            <th scope="col">{translate('analytics.period')}</th>
            <th scope="col">{translate('analytics.series.created')}</th>
            <th scope="col">{translate('analytics.series.completed')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td>{row.created}</td>
              <td>{row.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

export default TrendChart
