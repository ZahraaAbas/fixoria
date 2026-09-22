import { motion } from 'motion/react'
import { Link } from 'react-router'

function ServiceCard({ to, title, Icon, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.03 }}
      className="group relative"
    >
      {/* التوهّج الخلفي: تدرّج البطاقة نفسه، ضبابي وخافت */}
      <div
        aria-hidden="true"
        className="absolute -inset-3 rounded-[28px] opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-70"
        style={{ background: gradient }}
      />

      {/* البطاقة الزجاجية + الحدّ المتدرّج */}
      <Link
        to={to}
        className="relative flex flex-col items-center gap-3 rounded-3xl px-6 py-9 text-center no-underline backdrop-blur-md transition-shadow duration-300"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.72)) padding-box, ' +
            gradient +
            ' border-box',
          border: '1px solid transparent',
        }}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-1"
          style={{ background: gradient }}
        >
          <Icon size={26} strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="text-base font-bold text-[#263056]">{title}</span>
      </Link>
    </motion.div>
  )
}

export default ServiceCard