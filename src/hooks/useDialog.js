import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea, audio, [tabindex]:not([tabindex="-1"])'

// سلوك النوافذ المنبثقة: Esc يسد، التركيز يبقى داخلها، يمنع تمرير الصفحة، ويرجع التركيز للي فتحها
export function useDialog(isOpen, onClose) {
  const containerRef = useRef(null)
  const initialFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined
    const previous = document.activeElement
    ;(initialFocusRef.current || containerRef.current?.querySelector(FOCUSABLE))?.focus()

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !containerRef.current) return
      const focusable = containerRef.current.querySelectorAll(FOCUSABLE)
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
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [isOpen])

  return { containerRef, initialFocusRef }
}
