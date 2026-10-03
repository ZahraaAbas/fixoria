import { translate } from '../../i18n'
import { statusKey, statusTone } from '../../utils/requestStatus'

// شارة حالة طلب بلون ثابت في كل الموقع
function StatusBadge({ status, className = '' }) {
  return (
    <span className={`fx-badge fx-badge--${statusTone(status)} ${className}`}>
      {translate(`requestStatus.${statusKey(status)}`)}
    </span>
  )
}

export default StatusBadge
