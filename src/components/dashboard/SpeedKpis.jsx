import { Hammer, Timer } from 'lucide-react'
import { translate } from '../../i18n'
import { MIN_SAMPLE } from '../../analytics/requests'
import { formatHours } from '../../utils/duration'
import KpiCard from './KpiCard'

// سرعة الخدمة: وقت القبول ومدة التنفيذ (وسيط). بدون عينة كافية نقول شكد ناقص بدل رقم مضلّل.
function SpeedKpis({ speed, acceptLabelKey = 'speed.accept', workLabelKey = 'speed.work' }) {
  const note = (sample) =>
    sample >= MIN_SAMPLE
      ? translate('speed.sample').replace('{n}', sample)
      : translate('speed.notEnough').replace('{n}', sample).replace('{min}', MIN_SAMPLE)
  return (
    <>
      <li>
        <KpiCard
          Icon={Timer}
          tone="accent"
          label={translate(acceptLabelKey)}
          value={formatHours(speed.acceptMedian)}
          definition={`${translate('speed.acceptDef')} ${note(speed.acceptSample)}`}
        />
      </li>
      <li>
        <KpiCard
          Icon={Hammer}
          tone="navy"
          label={translate(workLabelKey)}
          value={formatHours(speed.workMedian)}
          definition={`${translate('speed.workDef')} ${note(speed.workSample)}`}
        />
      </li>
    </>
  )
}

export default SpeedKpis
