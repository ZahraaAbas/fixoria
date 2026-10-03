import { Link } from 'react-router'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { translate } from '../i18n'
import { Globe, ArrowLeft, Shield, Wrench, UserCheck, Eye } from 'lucide-react'
import BrandMark from '../components/ui/BrandMark'
import { easeOut, fadeUp, stagger } from '../components/ui/motion'
import heroImage from '../assets/images/background.webp'
import './Landing.css'

const ROLES = [
  { to: '/login', labelKey: 'landing.residentLogin', Icon: UserCheck, tone: 'primary' },
  { to: '/artisan/login', labelKey: 'landing.artisanLogin', Icon: Wrench, tone: 'default' },
  { to: '/home', labelKey: 'landing.guest', Icon: Eye, tone: 'default' },
  { to: '/admin/login', labelKey: 'landing.adminLogin', Icon: Shield, tone: 'subtle' },
]

function Landing() {
  const reduceMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(pointerY, { stiffness: 50, damping: 20 })
  const imageX = useTransform(smoothX, [-1, 1], [14, -14])
  const imageY = useTransform(smoothY, [-1, 1], [10, -10])

  const toggleLanguage = () => {
    const currentLang = localStorage.getItem('fixoria_lang') || 'ar'
    const newLang = currentLang === 'ar' ? 'en' : 'ar'
    localStorage.setItem('fixoria_lang', newLang)
    window.location.reload()
  }

  function handlePointerMove(event) {
    if (reduceMotion || event.pointerType !== 'mouse') return
    pointerX.set((event.clientX / window.innerWidth) * 2 - 1)
    pointerY.set((event.clientY / window.innerHeight) * 2 - 1)
  }

  return (
    <main className="landing" onPointerMove={handlePointerMove}>
      <div className="landing-backdrop" aria-hidden="true">
        <motion.img
          src={heroImage}
          alt=""
          className="landing-image"
          fetchPriority="high"
          decoding="async"
          style={reduceMotion ? undefined : { x: imageX, y: imageY }}
          initial={reduceMotion ? false : { scale: 1.18, opacity: 0 }}
          animate={{ scale: 1.08, opacity: 1 }}
          transition={{ duration: 1.8, ease: easeOut }}
        />
        <span className="landing-shade" />
        <span className="landing-orb landing-orb--a" />
        <span className="landing-orb landing-orb--b" />
      </div>

      <header className="landing-header">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <BrandMark tone="light" size="lg" />
        </motion.div>

        <motion.button
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
          onClick={toggleLanguage}
          className="landing-lang"
          title="تبديل اللغة / Change Language"
        >
          <Globe size={16} aria-hidden="true" />
          <span>{localStorage.getItem('fixoria_lang') === 'en' ? 'العربية' : 'English'}</span>
        </motion.button>
      </header>

      <div className="landing-body">
        <motion.div
          className="landing-copy"
          variants={stagger(0.35, 0.12)}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <motion.span variants={fadeUp} className="landing-badge">
            <span className="landing-badge-dot" aria-hidden="true" />
            {translate('footer.compound')}
          </motion.span>
          <motion.h1 variants={fadeUp} className="landing-title">
            {translate('landing.title')}
          </motion.h1>
          <motion.p variants={fadeUp} className="landing-description">
            {translate('landing.description')}
          </motion.p>
        </motion.div>

        <motion.nav
          className="landing-roles"
          aria-label={translate('nav.mainNav')}
          variants={stagger(0.55, 0.08)}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          {ROLES.map(({ to, labelKey, Icon, tone }) => (
            <motion.div key={to} variants={fadeUp}>
              <Link to={to} className={`landing-role landing-role--${tone}`}>
                <span className="landing-role-icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="landing-role-label">{translate(labelKey)}</span>
                <span className="landing-role-arrow" aria-hidden="true">
                  <ArrowLeft size={18} className="icon-forward" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.nav>
      </div>
    </main>
  )
}

export default Landing
