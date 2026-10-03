import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Home } from 'lucide-react'
import { translate } from '../i18n'
import BrandMark from '../components/ui/BrandMark'
import { easeOut } from '../components/ui/motion'
import './NotFound.css'

function NotFound() {
  const reduceMotion = useReducedMotion()

  return (
    <main className="not-found">
      <BrandMark />
      <motion.p
        className="not-found-code"
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.8, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
      >
        404
      </motion.p>
      <motion.div
        className="not-found-body"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
      >
        <h1 className="not-found-title">{translate('notFound.title')}</h1>
        <Link to="/" className="fx-btn fx-btn--primary fx-btn--lg">
          <Home size={18} aria-hidden="true" />
          {translate('notFound.backHome')}
        </Link>
      </motion.div>
    </main>
  )
}

export default NotFound
