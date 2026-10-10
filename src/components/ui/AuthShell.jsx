import { Link } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { translate } from '../../i18n'
import BrandMark from './BrandMark'
import LanguageToggle from './LanguageToggle'
import { fadeUp, stagger, easeOut } from './motion'
import heroImage from '../../assets/images/background.webp'
import './AuthShell.css'

// إطار موحّد لصفحات الدخول والتسجيل: لوحة بصرية + لوحة النموذج.
function AuthShell({ title, icon: Icon, wide = false, children }) {
  const reduceMotion = useReducedMotion()

  return (
    <main className={`auth-shell ${wide ? 'auth-shell--wide' : ''}`}>
      <motion.aside
        className="auth-visual"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: easeOut }}
      >
        <img src={heroImage} alt="" className="auth-visual-image" decoding="async" />
        <span className="auth-visual-shade" aria-hidden="true" />
        <span className="auth-visual-orb" aria-hidden="true" />

        <Link to="/home" className="auth-visual-brand">
          <BrandMark tone="light" />
        </Link>

        <motion.div
          className="auth-visual-copy"
          variants={stagger(0.3, 0.1)}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <motion.span variants={fadeUp} className="auth-visual-eyebrow">
            {translate('footer.compound')}
          </motion.span>
          <motion.p variants={fadeUp} className="auth-visual-title">
            {translate('landing.title')}
          </motion.p>
          <motion.p variants={fadeUp} className="auth-visual-text">
            {translate('landing.description')}
          </motion.p>
        </motion.div>
      </motion.aside>

      <section className="auth-panel">
        <LanguageToggle className="fx-btn fx-btn--ghost fx-btn--sm auth-lang" />
        <motion.div
          className="auth-panel-inner"
          variants={stagger(0.1, 0.06)}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <motion.div variants={fadeUp} className="auth-head">
            {Icon && (
              <span className="auth-head-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
            )}
            <h1 className="auth-heading">{title}</h1>
          </motion.div>
          <motion.div variants={fadeUp}>{children}</motion.div>
        </motion.div>
      </section>
    </main>
  )
}

export default AuthShell
