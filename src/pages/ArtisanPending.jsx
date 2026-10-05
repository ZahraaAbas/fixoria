import { motion, useReducedMotion } from 'motion/react'
import { Hourglass, LogOut, XCircle } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import BrandMark from '../components/ui/BrandMark'
import Avatar from '../components/ui/Avatar'
import { easeOut } from '../components/ui/motion'
import './ArtisanPending.css'

function ArtisanPending() {
  const { user, signOut } = useAuth()
  const reduceMotion = useReducedMotion()
  const isRejected = user?.status === 'rejected'
  const Icon = isRejected ? XCircle : Hourglass

  return (
    <main className="pending-page">
      <span className="pending-brand">
        <BrandMark />
      </span>

      <motion.div
        className={`pending-card fx-card ${isRejected ? 'is-rejected' : ''}`}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: easeOut }}
      >
        <span className="pending-glow" aria-hidden="true" />

        <span className="pending-icon" aria-hidden="true">
          {!isRejected && <span className="pending-ring" />}
          <Icon size={34} strokeWidth={1.8} />
        </span>

        <h1 className="pending-title">
          {translate(isRejected ? 'artisanPending.rejectedTitle' : 'artisanPending.title')}
        </h1>
        <p className="pending-text">
          {translate(isRejected ? 'artisanPending.rejectedDescription' : 'artisanPending.description')}
        </p>

        {user?.fullName && (
          <p className="pending-user">
            <Avatar src={user.avatar} name={user.fullName} className="pending-avatar" />
            {user.fullName}
          </p>
        )}

        <button type="button" className="fx-btn fx-btn--secondary" onClick={signOut}>
          <LogOut size={16} aria-hidden="true" />
          {translate('artisanPending.logout')}
        </button>
      </motion.div>
    </main>
  )
}

export default ArtisanPending
