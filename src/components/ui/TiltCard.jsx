import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

// بطاقة تميل بخفة باتجاه المؤشر (عمق ثلاثي الأبعاد).
// معطّلة تلقائيًا مع اللمس أو تقليل الحركة، فتبقى بطاقة عادية.
function TiltCard({ as = 'div', max = 6, className = '', style, children, ...rest }) {
  const reduceMotion = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const springConfig = { stiffness: 200, damping: 20, mass: 0.6 }
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), springConfig)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), springConfig)
  const glowX = useTransform(px, (value) => `${value * 100}%`)
  const glowY = useTransform(py, (value) => `${value * 100}%`)

  const Component = motion[as]

  function handleMove(event) {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width)
    py.set((event.clientY - rect.top) / rect.height)
  }

  function handleLeave() {
    px.set(0.5)
    py.set(0.5)
  }

  if (reduceMotion) {
    const Static = as
    return (
      <Static className={className} style={style} {...rest}>
        {children}
      </Static>
    )
  }

  return (
    <Component
      className={`tilt-card ${className}`}
      style={{ ...style, rotateX, rotateY, '--glow-x': glowX, '--glow-y': glowY, transformPerspective: 900 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default TiltCard
