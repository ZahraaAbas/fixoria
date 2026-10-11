import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Building2, CalendarClock, Check, CircleSlash, Star, User, Wallet, Wrench, X } from 'lucide-react'
import { getCurrentLanguage, translate } from '../../i18n'
import { formatDateTime } from '../../utils/formatDate'
import { formatIQD } from '../../utils/money'
import StatusBadge from '../ui/StatusBadge'
import MediaGallery from '../ui/MediaGallery'
import AudioNote from '../ui/AudioNote'
import './Requests.css'

const STAGES = ['pending', 'accepted', 'in_progress', 'completed']

// مراحل الطلب من حالته الحالية (ما عدنا أوقات كل مرحلة — بس الإنشاء والموعد والإكمال)
function Stages({ status }) {
  if (status === 'cancelled' || status === 'rejected') {
    return (
      <p className="rq-closed">
        <CircleSlash size={16} aria-hidden="true" />
        {translate(`requestStatus.${status}`)}
      </p>
    )
  }
  const current = STAGES.indexOf(status)
  return (
    <ol className="rq-stages">
      {STAGES.map((stage, index) => {
        const state = index < current || status === 'completed' ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li key={stage} className={`rq-stage rq-stage--${state}`} aria-current={index === current ? 'step' : undefined}>
            <span className="rq-stage-dot" aria-hidden="true">
              {state === 'done' ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <span>{translate(`requestStatus.${stage}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Row({ Icon, label, children }) {
  return (
    <div className="rq-row">
      <dt>
        <Icon size={15} aria-hidden="true" />
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  )
}

function RequestDrawer({ request, onClose }) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const isRtl = getCurrentLanguage() !== 'en'

  // Esc يسد، والتركيز يبقى داخل اللوحة، ويرجع للزر الي فتحها
  useEffect(() => {
    if (!request) return undefined
    const previous = document.activeElement
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll('button, a[href], audio, [tabindex]:not([tabindex="-1"])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [request, onClose])

  const offset = isRtl ? '-100%' : '100%'

  if (!request) return null

  // على body مباشرة: أي أب متحرك (transform) يخلي position: fixed نسبةً إله بدل الشاشة.
  // تنفتح بحركة، وتنسد فورًا (بدون انتظار حركة خروج) حتى ما تعلك إذا المتصفح وقّف الحركات
  return createPortal(
    <div className="rq-drawer-root">
      <motion.div
        className="rq-overlay"
        onClick={onClose}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.aside
        ref={panelRef}
        className="rq-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rq-drawer-title"
        initial={reduceMotion ? false : { x: offset }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      >
        <header className="rq-drawer-head">
          <div>
            <p className="rq-drawer-id">#{request.id}</p>
            <h2 id="rq-drawer-title" className="rq-drawer-title">
              {request.title || request.categoryName}
            </h2>
            <div className="rq-drawer-tags">
              <StatusBadge status={request.status} />
              <span className="fx-badge fx-badge--plain">{request.categoryName}</span>
            </div>
          </div>
          <button ref={closeRef} type="button" className="rq-close" onClick={onClose} aria-label={translate('requestsTable.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="rq-drawer-body">
          <section aria-label={translate('requestsTable.stages')}>
            <h3 className="rq-section-title">{translate('requestsTable.stages')}</h3>
            <Stages status={request.status} />
          </section>

          <section>
            <h3 className="rq-section-title">{translate('requestsTable.details')}</h3>
            <dl className="rq-rows">
              <Row Icon={CalendarClock} label={translate('requestsTable.createdAt')}>
                {request.createdAt ? formatDateTime(request.createdAt) : '—'}
              </Row>
              {request.scheduledAt && (
                <Row Icon={CalendarClock} label={translate('requestsTable.scheduledAt')}>
                  {formatDateTime(request.scheduledAt)}
                </Row>
              )}
              {request.completedAt && (
                <Row Icon={Check} label={translate('requestsTable.completedAt')}>
                  {formatDateTime(request.completedAt)}
                </Row>
              )}
              <Row Icon={Building2} label={translate('requestsTable.location')}>
                {[request.compoundName, request.building, request.apartment && `${translate('request.apartment')} ${request.apartment}`]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </Row>
              <Row Icon={User} label={translate('requestsTable.resident')}>
                {request.residentName || '—'}
              </Row>
              <Row Icon={Wrench} label={translate('requestsTable.artisan')}>
                {request.artisanName || translate('requestsTable.unassigned')}
              </Row>
              {request.price != null && (
                <Row Icon={Wallet} label={translate('requestsTable.payment')}>
                  {formatIQD(request.price)} ·{' '}
                  {request.paymentStatus === 'paid'
                    ? `${translate('payments.paid')}${request.paymentMethod ? ` (${translate(`payments.method.${request.paymentMethod}`)})` : ''}`
                    : translate('payments.unpaidBadge')}
                </Row>
              )}
            </dl>
          </section>

          {request.description && (
            <section>
              <h3 className="rq-section-title">{translate('requestsTable.description')}</h3>
              <p className="rq-description">{request.description}</p>
            </section>
          )}

          {(request.images.length > 0 || request.audio) && (
            <section>
              <h3 className="rq-section-title">{translate('requestsTable.attachments')}</h3>
              {request.images.length > 0 && (
                <MediaGallery images={request.images} label={translate('requestDetail.photos')} size="sm" />
              )}
              <AudioNote src={request.audio} />
            </section>
          )}

          {request.review && (
            <section>
              <h3 className="rq-section-title">{translate('requestsTable.review')}</h3>
              <p className="rq-review">
                <span className="rq-stars" aria-label={translate('requestsTable.ratingOf').replace('{n}', request.review.rating)}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={15} aria-hidden="true" className={i < request.review.rating ? 'is-on' : ''} />
                  ))}
                </span>
                {request.review.isHidden && <span className="fx-badge fx-badge--cancelled">{translate('requestsTable.hiddenReview')}</span>}
              </p>
              {request.review.comment && <p className="rq-description">{request.review.comment}</p>}
            </section>
          )}

          <p className="rq-note">{translate('requestsTable.historyNote')}</p>
        </div>
      </motion.aside>
    </div>,
    document.body,
  )
}

export default RequestDrawer
