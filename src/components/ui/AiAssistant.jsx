import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CheckCircle2, Pencil, Send, Sparkles, X } from 'lucide-react'
import { translate, getCurrentLanguage } from '../../i18n'
import { analyzeServiceRequest, confirmDraft } from '../../services/aiService'
import { getCategories } from '../../services/categoriesService'
import ActionError from './ActionError'
import { spring } from './motion'
import './AiAssistant.css'

/**
 * المساعد الذكي لطلب الخدمة — منقول من AiAssistantModal (فرع BackendChatbot، شغل دانيا)
 * بتصميم الموقع الجديد. نفس الخطوات: الساكن يوصف المشكلة → الخادم يرجّع مسودة → ملخص
 * مع (تأكيد / تعديل) → عند التأكيد نفس POST /resident/requests مال الطلب اليدوي.
 */

const EXAMPLES = ['ai.example1', 'ai.example2', 'ai.example3']

function formatTime(value) {
  if (!value) return translate('ai.timeUnset')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return translate('ai.timeUnset')
  return date.toLocaleString(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
}

function errorKeyFor(error) {
  if (error.message === 'NETWORK_ERROR') return 'common.networkError'
  if (error.message === 'AI_UNAVAILABLE') return 'ai.unavailable'
  if (error.message === 'AI_RATE_LIMIT') return 'ai.rateLimit'
  return 'ai.failed'
}

function AiAssistant({ contactName, onClose }) {
  const reduceMotion = useReducedMotion()
  const [messages, setMessages] = useState([{ role: 'assistant', content: translate('ai.greeting') }])
  const [input, setInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [draft, setDraft] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [created, setCreated] = useState(null)
  const [errorKey, setErrorKey] = useState('')
  const [categories, setCategories] = useState([])

  const inputRef = useRef(null)
  const endRef = useRef(null)

  // Escape يغلق، والتركيز على حقل الكتابة عند الفتح، وقفل تمرير الصفحة خلف النافذة
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    let isCancelled = false
    getCategories()
      .then((data) => !isCancelled && setCategories(data))
      .catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' })
  }, [messages, isBusy, draft, reduceMotion])

  async function send(text = input) {
    const message = text.trim()
    if (message.length < 2 || isBusy) return
    // المحادثة السابقة (بدون الترحيب) حتى يفهم المساعد الردود المكمّلة
    const history = messages.slice(1).map(({ role, content }) => ({ role, content }))
    setMessages((current) => [...current, { role: 'user', content: message }])
    setInput('')
    setIsBusy(true)
    setErrorKey('')
    setIsEditing(false)
    try {
      const result = await analyzeServiceRequest(message, history)
      setMessages((current) => [...current, { role: 'assistant', content: result.assistant_message }])
      setDraft(result.status === 'ready' ? result.request : null)
    } catch (error) {
      setErrorKey(errorKeyFor(error))
    } finally {
      setIsBusy(false)
    }
  }

  async function confirm() {
    if (!draft?.service_id || !(draft.problem || '').trim()) return setErrorKey('ai.missingFields')
    if (draft.preferred_time && new Date(draft.preferred_time) < new Date()) return setErrorKey('ai.pastTime')

    setIsBusy(true)
    setErrorKey('')
    try {
      setCreated(await confirmDraft(draft, { contactName, urgentLabel: translate('ai.urgentNote') }))
    } catch (error) {
      setErrorKey(error.message === 'NETWORK_ERROR' ? 'common.networkError' : 'ai.createFailed')
    } finally {
      setIsBusy(false)
    }
  }

  function patchDraft(changes) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function handleServiceChange(event) {
    const id = Number(event.target.value)
    const category = categories.find((item) => item.id === id)
    if (category) patchDraft({ service_id: id, service_name: category.name })
  }

  const showExamples = messages.length === 1 && !isBusy

  return (
    <motion.div
      className="ai-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="ai-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-title"
        onClick={(event) => event.stopPropagation()}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={reduceMotion ? { duration: 0 } : spring}
      >
        <header className="ai-head">
          <span className="ai-head-icon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <div className="ai-head-text">
            <h2 id="ai-title">{translate('ai.title')}</h2>
            <p>{translate('ai.subtitle')}</p>
          </div>
          <button type="button" className="ai-close" onClick={onClose} aria-label={translate('ai.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {created ? (
          <div className="ai-created" role="status">
            <span className="ai-created-icon" aria-hidden="true">
              <CheckCircle2 size={34} />
            </span>
            <p>{translate('ai.created')}</p>
            <div className="ai-created-actions">
              <Link to={`/my-requests/${created.id}`} className="fx-btn fx-btn--primary" onClick={onClose}>
                {translate('ai.viewRequest')}
              </Link>
              <button type="button" className="fx-btn fx-btn--secondary" onClick={onClose}>
                {translate('ai.close')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ai-thread" aria-live="polite">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  className={`ai-msg ai-msg--${message.role}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="sr-only">{translate(message.role === 'user' ? 'ai.you' : 'ai.assistant')}: </span>
                  {message.content}
                </motion.div>
              ))}

              {isBusy && !draft && (
                <div className="ai-msg ai-msg--assistant ai-typing" role="status">
                  <span className="sr-only">{translate('ai.thinking')}</span>
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                </div>
              )}

              {showExamples && (
                <div className="ai-examples">
                  <p>{translate('ai.examplesTitle')}</p>
                  {EXAMPLES.map((key) => (
                    <button key={key} type="button" className="ai-example" onClick={() => send(translate(key))}>
                      {translate(key)}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {draft && (
                  <motion.section
                    className="ai-draft"
                    aria-labelledby="ai-draft-title"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 id="ai-draft-title">{translate('ai.draftTitle')}</h3>

                    {isEditing ? (
                      <div className="ai-draft-form">
                        <label className="fx-field">
                          <span className="fx-label">{translate('ai.service')}</span>
                          <select className="fx-input" value={draft.service_id} onChange={handleServiceChange}>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="fx-field">
                          <span className="fx-label">{translate('ai.problem')}</span>
                          <textarea
                            className="fx-input"
                            rows={3}
                            value={draft.problem}
                            onChange={(event) => patchDraft({ problem: event.target.value })}
                          />
                        </label>
                        <div className="ai-draft-row">
                          <label className="fx-field">
                            <span className="fx-label">{translate('ai.priority')}</span>
                            <select
                              className="fx-input"
                              value={draft.priority}
                              onChange={(event) => patchDraft({ priority: event.target.value })}
                            >
                              <option value="normal">{translate('ai.priorityNormal')}</option>
                              <option value="urgent">{translate('ai.priorityUrgent')}</option>
                            </select>
                          </label>
                          <label className="fx-field">
                            <span className="fx-label">{translate('ai.time')}</span>
                            <input
                              className="fx-input"
                              type="datetime-local"
                              value={(draft.preferred_time || '').slice(0, 16)}
                              onChange={(event) => patchDraft({ preferred_time: event.target.value || null })}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <dl className="ai-draft-list">
                        <div>
                          <dt>{translate('ai.service')}</dt>
                          <dd>{draft.service_name}</dd>
                        </div>
                        <div>
                          <dt>{translate('ai.problem')}</dt>
                          <dd>{draft.problem}</dd>
                        </div>
                        <div>
                          <dt>{translate('ai.priority')}</dt>
                          <dd>
                            <span className={`fx-badge ${draft.priority === 'urgent' ? 'fx-badge--rejected' : 'fx-badge--navy'}`}>
                              {translate(draft.priority === 'urgent' ? 'ai.priorityUrgent' : 'ai.priorityNormal')}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>{translate('ai.time')}</dt>
                          <dd>{formatTime(draft.preferred_time)}</dd>
                        </div>
                        {draft.additional_details?.length > 0 && (
                          <div>
                            <dt>{translate('ai.details')}</dt>
                            <dd>{draft.additional_details.join(translate('common.comma'))}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    <div className="ai-draft-actions">
                      <button type="button" className="fx-btn fx-btn--primary" onClick={confirm} disabled={isBusy}>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {translate(isBusy ? 'ai.confirming' : 'ai.confirm')}
                      </button>
                      <button
                        type="button"
                        className="fx-btn fx-btn--secondary"
                        onClick={() => setIsEditing((value) => !value)}
                        disabled={isBusy}
                      >
                        <Pencil size={15} aria-hidden="true" />
                        {translate(isEditing ? 'ai.doneEditing' : 'ai.edit')}
                      </button>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              <span ref={endRef} />
            </div>

            <ActionError messageKey={errorKey} className="ai-error" />

            <form
              className="ai-composer"
              onSubmit={(event) => {
                event.preventDefault()
                send()
              }}
            >
              <label htmlFor="ai-input" className="sr-only">
                {translate('ai.placeholder')}
              </label>
              <textarea
                id="ai-input"
                ref={inputRef}
                className="fx-input ai-input"
                rows={2}
                maxLength={1000}
                value={input}
                placeholder={translate('ai.placeholder')}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    send()
                  }
                }}
              />
              <button
                type="submit"
                className="fx-btn fx-btn--primary fx-btn--icon ai-send"
                disabled={isBusy || input.trim().length < 2}
                aria-label={translate('ai.send')}
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default AiAssistant
