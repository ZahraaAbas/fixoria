import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { translate } from '../../i18n'
import { useAuth } from '../../hooks/useAuth'
import AiAssistant from './AiAssistant'

// زر يفتح المساعد الذكي. يظهر للساكن فقط (الخادم يسمح بالمساعد للسكان فقط)
function AiAssistantButton({ className = 'fx-btn fx-btn--secondary', size = 18 }) {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const close = useCallback(() => setIsOpen(false), [])

  if (!isAuthenticated || user.role !== 'resident') return null

  return (
    <>
      <button type="button" className={className} onClick={() => setIsOpen(true)} title={translate('ai.openHint')}>
        <Sparkles size={size} aria-hidden="true" />
        {translate('ai.open')}
      </button>
      {/* النافذة تُرسم في body: الزر قد يكون داخل عنصر متحرك (transform) يكسر position: fixed */}
      {createPortal(
        <AnimatePresence>{isOpen && <AiAssistant contactName={user.fullName} onClose={close} />}</AnimatePresence>,
        document.body,
      )}
    </>
  )
}

export default AiAssistantButton
