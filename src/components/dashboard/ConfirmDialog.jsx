import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { TriangleAlert } from 'lucide-react'
import { translate } from '../../i18n'
import { useDialog } from '../../hooks/useDialog'
import './Dashboard.css'

// نافذة تأكيد قبل الإجراءات المهمة. التركيز يبدأ على "رجوع" حتى ما ينضغط الإجراء بالغلط.
function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, isBusy = false, tone = 'danger' }) {
  const reduceMotion = useReducedMotion()
  const { containerRef, initialFocusRef } = useDialog(open, onCancel)

  if (!open) return null

  return createPortal(
    <div className="cf-root">
      <div className="cf-overlay" onClick={onCancel} />
      <motion.div
        ref={containerRef}
        className="cf-dialog fx-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cf-title"
        aria-describedby="cf-message"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <span className={`cf-icon cf-icon--${tone}`} aria-hidden="true">
          <TriangleAlert size={20} />
        </span>
        <h2 id="cf-title" className="cf-title">
          {title}
        </h2>
        <p id="cf-message" className="cf-message">
          {message}
        </p>
        <div className="cf-actions">
          <button ref={initialFocusRef} type="button" className="fx-btn fx-btn--ghost" onClick={onCancel} disabled={isBusy}>
            {translate('common.back')}
          </button>
          <button
            type="button"
            className={`fx-btn ${tone === 'danger' ? 'fx-btn--danger' : 'fx-btn--primary'}`}
            onClick={onConfirm}
            disabled={isBusy}
            data-loading={isBusy || undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
