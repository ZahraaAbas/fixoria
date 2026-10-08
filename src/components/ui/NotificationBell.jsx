import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BadgeCheck,
  Ban,
  Bell,
  BellOff,
  CheckCheck,
  CircleCheck,
  CircleX,
  ClipboardList,
  Inbox,
  MessageSquareWarning,
  Star,
  Wrench,
} from 'lucide-react'
import { getCurrentLanguage, translate } from '../../i18n'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, parseApiDate } from '../../utils/formatDate'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsService'
import './NotificationBell.css'

const POLL_MS = 60 * 1000
const PANEL_MAX_WIDTH = 380
const EDGE = 12
const GAP = 10

const TYPE_STYLE = {
  request_received: { Icon: ClipboardList, tone: 'info' },
  request_assigned: { Icon: ClipboardList, tone: 'info' },
  request_accepted: { Icon: CircleCheck, tone: 'success' },
  request_rejected: { Icon: CircleX, tone: 'danger' },
  request_in_progress: { Icon: Wrench, tone: 'accent' },
  request_completed: { Icon: BadgeCheck, tone: 'success' },
  request_cancelled: { Icon: Ban, tone: 'danger' },
  new_request: { Icon: Inbox, tone: 'accent' },
  complaint_update: { Icon: MessageSquareWarning, tone: 'info' },
}

function styleFor(notification) {
  if (TYPE_STYLE[notification.type]) return TYPE_STYLE[notification.type]
  // "general" مربوط بطلب = تقييم جديد للحرفي
  if (notification.requestId) return { Icon: Star, tone: 'accent' }
  return { Icon: Bell, tone: 'info' }
}

// عنوان مترجم لإشعارات الطلبات، وباقي الأنواع نعرض نص الخادم كما هو
function titleFor(notification) {
  const key = `notifications.types.${notification.type}`
  const text = translate(key)
  if (text === key || !notification.requestId) return notification.title
  return text.replace('{id}', notification.requestId)
}

// وين يودي الضغط على الإشعار حسب الدور
function destinationFor(notification, role) {
  const { type, requestId } = notification
  if (role === 'resident') return requestId ? `/my-requests/${requestId}` : null
  if (role === 'artisan') {
    if (type === 'new_request') return '/artisan/requests'
    if (type === 'general' && requestId) return '/artisan/reviews'
    if (requestId) return '/artisan/my-work'
    return '/artisan/dashboard'
  }
  if (role === 'admin' && requestId) return '/admin/requests'
  return null
}

function timeAgo(value) {
  const seconds = Math.round((parseApiDate(value).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return translate('notifications.justNow')
  const rtf = new Intl.RelativeTimeFormat(getCurrentLanguage() === 'en' ? 'en' : 'ar-IQ', { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return formatDate(value)
}

// مكان القائمة تحت الجرس (أو فوقه إذا ما أكو مكان تحت)، وتبقى داخل الشاشة
function panelPosition(button) {
  const rect = button.getBoundingClientRect()
  const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - EDGE * 2)
  const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE)
  const spaceBelow = window.innerHeight - rect.bottom - GAP - EDGE
  const spaceAbove = rect.top - GAP - EDGE
  if (spaceBelow < 320 && spaceAbove > spaceBelow) {
    return { left, width, bottom: window.innerHeight - rect.top + GAP, maxHeight: spaceAbove }
  }
  return { left, width, top: rect.bottom + GAP, maxHeight: Math.max(spaceBelow, 200) }
}

function NotificationBell({ className = '', iconSize = 18 }) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const panelId = useId()
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const [unread, setUnread] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [hasError, setHasError] = useState(false)
  const [position, setPosition] = useState(null)
  const userId = user?.id

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then(setUnread)
      .catch(() => {})
  }, [])

  const loadItems = useCallback(() => {
    setHasError(false)
    getNotifications({ limit: 20 })
      .then(setItems)
      .catch(() => setHasError(true))
  }, [])

  // تحديث العدد كل دقيقة (والصفحة ظاهرة) وكلما رجع المستخدم للصفحة
  useEffect(() => {
    if (!isAuthenticated) return undefined
    refreshCount()
    function refreshIfVisible() {
      if (document.visibilityState === 'visible') refreshCount()
    }
    const timer = window.setInterval(refreshIfVisible, POLL_MS)
    document.addEventListener('visibilitychange', refreshIfVisible)
    window.addEventListener('focus', refreshIfVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfVisible)
      window.removeEventListener('focus', refreshIfVisible)
    }
  }, [isAuthenticated, userId, refreshCount])

  const close = useCallback(() => setIsOpen(false), [])

  function open() {
    setPosition(panelPosition(buttonRef.current))
    setIsOpen(true)
    loadItems()
    refreshCount()
  }

  // إغلاق بـ Escape أو بالضغط خارج القائمة، وتحديث المكان مع تغيير حجم الشاشة
  useEffect(() => {
    if (!isOpen) return undefined
    const button = buttonRef.current
    panelRef.current?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        close()
        button?.focus()
      }
    }
    function handlePointer(event) {
      if (!panelRef.current?.contains(event.target) && !button?.contains(event.target)) close()
    }
    function handleResize() {
      if (button) setPosition(panelPosition(button))
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handlePointer)
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, { passive: true })
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handlePointer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize)
    }
  }, [isOpen, close])

  if (!isAuthenticated) return null

  function handleItemClick(notification) {
    if (!notification.isRead) {
      setItems((list) => list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)))
      setUnread((count) => Math.max(0, count - 1))
      markNotificationRead(notification.id).catch(refreshCount)
    }
    const destination = destinationFor(notification, user.role)
    if (destination) {
      close()
      navigate(destination)
    }
  }

  function handleMarkAll() {
    setItems((list) => list?.map((n) => ({ ...n, isRead: true })) ?? list)
    setUnread(0)
    markAllNotificationsRead().catch(() => {
      refreshCount()
      loadItems()
    })
  }

  const badge = unread > 9 ? '9+' : String(unread)
  const label = unread
    ? translate('notifications.titleWithCount').replace('{count}', unread)
    : translate('notifications.title')

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`nb-button ${className}`}
        aria-label={label}
        title={translate('notifications.title')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => (isOpen ? close() : open())}
      >
        <Bell size={iconSize} aria-hidden="true" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={badge}
              className="nb-badge"
              aria-hidden="true"
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* القائمة تُرسم في body: الهيدر والسايدبار عندهم overflow/transform يقصّون العناصر المطلقة */}
      {createPortal(
        <AnimatePresence>
          {isOpen && position && (
            <motion.div
              ref={panelRef}
              id={panelId}
              className="nb-panel"
              role="dialog"
              aria-label={translate('notifications.title')}
              tabIndex={-1}
              style={position}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: position.top ? -6 : 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: position.top ? -4 : 4, scale: 0.98 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            >
              <div className="nb-head">
                <h2 className="nb-title">{translate('notifications.title')}</h2>
                {unread > 0 && (
                  <button type="button" className="nb-mark-all" onClick={handleMarkAll}>
                    <CheckCheck size={15} aria-hidden="true" />
                    {translate('notifications.markAllRead')}
                  </button>
                )}
              </div>

              <div className="nb-body">
                {!items && !hasError && (
                  <p className="nb-state" role="status">
                    <span className="nb-spinner" aria-hidden="true" />
                    {translate('common.loading')}
                  </p>
                )}

                {!items && hasError && (
                  <div className="nb-state">
                    <p>{translate('notifications.loadError')}</p>
                    <button type="button" className="fx-btn fx-btn--secondary fx-btn--sm" onClick={loadItems}>
                      {translate('notifications.retry')}
                    </button>
                  </div>
                )}

                {items?.length === 0 && (
                  <div className="nb-empty">
                    <span className="nb-empty-icon" aria-hidden="true">
                      <BellOff size={22} />
                    </span>
                    <p>{translate('notifications.empty')}</p>
                    <span>{translate('notifications.emptyHint')}</span>
                  </div>
                )}

                {items?.length > 0 && (
                  <ul className="nb-list">
                    {items.map((notification) => {
                      const { Icon, tone } = styleFor(notification)
                      return (
                        <li key={notification.id}>
                          <button
                            type="button"
                            className={`nb-item ${notification.isRead ? '' : 'is-unread'}`}
                            onClick={() => handleItemClick(notification)}
                          >
                            <span className={`nb-icon nb-icon--${tone}`} aria-hidden="true">
                              <Icon size={17} />
                            </span>
                            <span className="nb-text">
                              <span className="nb-item-title">{titleFor(notification)}</span>
                              {notification.body && <span className="nb-item-body">{notification.body}</span>}
                              <span className="nb-time">{timeAgo(notification.createdAt)}</span>
                            </span>
                            {!notification.isRead && (
                              <span className="nb-dot">
                                <span className="sr-only">{translate('notifications.unread')}</span>
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export default NotificationBell
