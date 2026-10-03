// قيم حركة مشتركة لكل الموقع — حتى تشعر كل الحركات أنها من نفس المنتج.

export const easeOut = [0.22, 1, 0.36, 1]

export const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }
export const softSpring = { type: 'spring', stiffness: 160, damping: 22 }

export const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: easeOut },
  },
}

// نسخة أخف بلا blur — لعناصر القوائم والشبكات (أداء أفضل مع عدد كبير من العناصر)
export const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: easeOut } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: easeOut } },
}

export function stagger(delayChildren = 0, staggerChildren = 0.08) {
  return {
    hidden: {},
    visible: { transition: { delayChildren, staggerChildren } },
  }
}

// تفاعل زر/بطاقة قياسي
export const pressable = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.97 },
  transition: spring,
}
