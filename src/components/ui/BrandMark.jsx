import { Wrench } from 'lucide-react'
import { translate } from '../../i18n'
import './BrandMark.css'

// شعار سبع صنايع: علامة متدرجة + الاسم. tone="light" للخلفيات الداكنة.
function BrandMark({ tone = 'dark', size = 'md', showName = true }) {
  return (
    <span className={`brand-mark brand-mark--${tone} brand-mark--${size}`}>
      <span className="brand-mark__icon" aria-hidden="true">
        <Wrench size={size === 'lg' ? 20 : 16} strokeWidth={2.4} />
      </span>
      {showName && <span className="brand-mark__name">{translate('common.brand')}</span>}
    </span>
  )
}

export default BrandMark
