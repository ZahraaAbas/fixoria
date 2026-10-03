import { Children } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { rise, stagger } from './motion'

// يكشف المحتوى عند دخوله الشاشة. مع تقليل الحركة يظهر مباشرة بلا انتقال.
export function Reveal({ as = 'div', variants = rise, delay = 0, once = true, amount = 0.1, children, ...rest }) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as]

  if (reduceMotion) {
    const Static = as
    return <Static {...rest}>{children}</Static>
  }

  // التأخير يُدمج داخل انتقال حالة visible (انتقال الـ variant يتقدّم على خاصية transition)
  const delayedVariants = delay
    ? {
        ...variants,
        visible: {
          ...variants.visible,
          transition: { ...variants.visible?.transition, delay },
        },
      }
    : variants

  return (
    <Component
      variants={delayedVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </Component>
  )
}

// أقصى مدة إجمالية للتتابع، حتى لا ينتظر آخر عنصر في القوائم الطويلة ثوانٍ
const MAX_STAGGER_TOTAL = 0.6

// حاوية تتابع: أبناؤها (RevealItem) يظهرون واحدًا تلو الآخر.
// amount = 0: تبدأ بمجرد ظهور أي جزء منها (القوائم الطويلة أطول من الشاشة بكثير)
export function RevealGroup({ as = 'div', delay = 0, gap = 0.08, once = true, amount = 0, children, ...rest }) {
  const reduceMotion = useReducedMotion()
  const Component = motion[as]

  if (reduceMotion) {
    const Static = as
    return <Static {...rest}>{children}</Static>
  }

  const count = Math.max(Children.count(children), 1)
  const effectiveGap = Math.min(gap, MAX_STAGGER_TOTAL / count)

  return (
    <Component
      variants={stagger(delay, effectiveGap)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export function RevealItem({ as = 'div', variants = rise, children, ...rest }) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    const Static = as
    return <Static {...rest}>{children}</Static>
  }

  const Component = motion[as]
  return (
    <Component variants={variants} {...rest}>
      {children}
    </Component>
  )
}
