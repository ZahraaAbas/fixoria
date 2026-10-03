import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { easeOut } from './motion'

// رقم يعدّ تصاعديًا عند ظهوره على الشاشة
function CountUp({ value, decimals = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)

  useEffect(() => {
    if (!isInView || reduceMotion) return undefined
    const controls = animate(0, value, {
      duration: 1.4,
      ease: easeOut,
      onUpdate: (latest) => setDisplay(latest),
    })
    return () => controls.stop()
  }, [isInView, reduceMotion, value])

  return <span ref={ref}>{(reduceMotion ? value : display).toFixed(decimals)}</span>
}

export default CountUp
