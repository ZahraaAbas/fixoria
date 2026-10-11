import { useState } from 'react'
import { CircleCheck, MessageSquareReply, MessageSquareWarning, Send, X } from 'lucide-react'
import { translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { createComplaint, getMyComplaints } from '../../services/complaintsService'
import { formatDateTime } from '../../utils/formatDate'
import ActionError from '../ui/ActionError'
import './RequestComplaint.css'

const BADGE = { open: 'fx-badge--rejected', in_review: 'fx-badge--accepted', resolved: 'fx-badge--completed' }

// شكوى عن هذا الطلب: تروح لمشرف المجمع، والساكن يشوف حالتها ورد الإدارة هنا
function RequestComplaint({ requestId }) {
  const { data } = useLoader(getMyComplaints)
  const [created, setCreated] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const mine = [...created, ...(data || []).filter((c) => !created.some((n) => n.id === c.id))].filter(
    (c) => String(c.requestId) === String(requestId),
  )

  async function submit(event) {
    event.preventDefault()
    const next = {
      subject: subject.trim() ? null : 'complaints.subjectRequired',
      message: message.trim().length >= 10 ? null : 'complaints.messageRequired',
    }
    setErrors(next)
    if (next.subject || next.message) return
    setIsBusy(true)
    setError('')
    try {
      const complaint = await createComplaint({ requestId: Number(requestId), subject: subject.trim(), message: message.trim() })
      setCreated((current) => [complaint, ...current])
      setSubject('')
      setMessage('')
      setIsOpen(false)
      setSent(true)
    } catch {
      setError('common.actionError')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="rd-card fx-card rc" aria-labelledby="rc-title">
      <h2 id="rc-title" className="rd-card-title">
        <MessageSquareWarning size={16} aria-hidden="true" />
        {translate('complaints.title')}
      </h2>

      {sent && (
        <p className="flash" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          {translate('complaints.sent')}
        </p>
      )}

      {mine.length > 0 && (
        <ul className="rc-list">
          {mine.map((c) => (
            <li key={c.id} className="rc-item">
              <div className="rc-item-head">
                <strong>{c.subject}</strong>
                <span className={`fx-badge ${BADGE[c.status]}`}>{translate(`adminComplaints.status.${c.status}`)}</span>
              </div>
              <p className="rc-date">{formatDateTime(c.createdAt)}</p>
              {c.reply && (
                <p className="rc-reply">
                  <MessageSquareReply size={15} aria-hidden="true" />
                  <span>
                    <b>{translate('complaints.adminReply')}</b> {c.reply}
                  </span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isOpen ? (
        <div className="rc-cta">
          <p>{translate('complaints.prompt')}</p>
          <button type="button" className="fx-btn fx-btn--secondary fx-btn--sm" onClick={() => setIsOpen(true)}>
            {translate('complaints.open')}
          </button>
        </div>
      ) : (
        <form className="rc-form" onSubmit={submit} noValidate>
          <label className="fx-field">
            <span className="fx-label">{translate('complaints.subject')}</span>
            <input
              className="fx-input"
              value={subject}
              maxLength={120}
              onChange={(event) => setSubject(event.target.value)}
              aria-invalid={Boolean(errors.subject) || undefined}
            />
            {errors.subject && <span className="fx-error-text">{translate(errors.subject)}</span>}
          </label>
          <label className="fx-field">
            <span className="fx-label">{translate('complaints.message')}</span>
            <textarea
              className="fx-input"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-invalid={Boolean(errors.message) || undefined}
            />
            {errors.message && <span className="fx-error-text">{translate(errors.message)}</span>}
          </label>
          <ActionError messageKey={error} />
          <div className="rc-actions">
            <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={isBusy} data-loading={isBusy || undefined}>
              <Send size={15} aria-hidden="true" />
              {translate('complaints.send')}
            </button>
            <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm" onClick={() => setIsOpen(false)}>
              <X size={15} aria-hidden="true" />
              {translate('payments.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default RequestComplaint
