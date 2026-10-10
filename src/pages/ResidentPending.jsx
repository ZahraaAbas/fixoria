import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Ban, Hourglass, LogOut, RefreshCw, UserRound, XCircle } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import { reloadCurrentUser } from '../services/authService'
import BrandMark from '../components/ui/BrandMark'
import Avatar from '../components/ui/Avatar'
import { easeOut } from '../components/ui/motion'
import { isApprovedResident } from '../utils/roles'
import './ArtisanPending.css'

// الساكن قبل موافقة إدارة مجمعه (أو إذا انرفض، أو المجمع موقوف)
function ResidentPending() {
  const { user, signOut, signIn } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [isChecking, setIsChecking] = useState(false)

  // نتحقق أول ما تنفتح الصفحة: يمكن المشرف وافق من آخر مرة
  useEffect(() => {
    let isCancelled = false
    reloadCurrentUser()
      .then((fresh) => {
        if (isCancelled) return
        signIn(fresh)
        if (isApprovedResident(fresh)) navigate('/home', { replace: true })
      })
      .catch(() => {})
    return () => {
      isCancelled = true
    }
  }, [navigate, signIn])

  async function check() {
    setIsChecking(true)
    try {
      const fresh = await reloadCurrentUser()
      signIn(fresh)
      if (isApprovedResident(fresh)) navigate('/home', { replace: true })
    } catch {
      // الحالة تبقى مثل ما هي؛ الساكن يكدر يعيد المحاولة
    } finally {
      setIsChecking(false)
    }
  }

  const state = !user?.compoundActive ? 'paused' : user?.membershipStatus === 'rejected' ? 'rejected' : 'pending'
  const Icon = { pending: Hourglass, rejected: XCircle, paused: Ban }[state]
  const compound = user?.compoundName || ''

  return (
    <main className="pending-page">
      <Link to="/home" className="pending-brand">
        <BrandMark />
      </Link>

      <motion.div
        className={`pending-card fx-card ${state === 'pending' ? '' : 'is-rejected'}`}
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: easeOut }}
      >
        <span className="pending-glow" aria-hidden="true" />

        <span className="pending-icon" aria-hidden="true">
          {state === 'pending' && <span className="pending-ring" />}
          <Icon size={34} strokeWidth={1.8} />
        </span>

        <h1 className="pending-title">{translate(`residentPending.${state}Title`)}</h1>
        <p className="pending-text">{translate(`residentPending.${state}Text`).replace('{compound}', compound)}</p>

        {user?.fullName && (
          <p className="pending-user">
            <Avatar src={user.avatar} name={user.fullName} className="pending-avatar" />
            {user.fullName}
          </p>
        )}

        <div className="pending-actions">
          {state === 'pending' && (
            <button type="button" className="fx-btn fx-btn--primary" onClick={check} disabled={isChecking}>
              <RefreshCw size={16} aria-hidden="true" />
              {translate(isChecking ? 'residentPending.checking' : 'residentPending.check')}
            </button>
          )}
          <Link to="/profile" className="fx-btn fx-btn--secondary">
            <UserRound size={16} aria-hidden="true" />
            {translate('nav.profile')}
          </Link>
          <button type="button" className="fx-btn fx-btn--ghost" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            {translate('nav.logout')}
          </button>
        </div>
      </motion.div>
    </main>
  )
}

export default ResidentPending
