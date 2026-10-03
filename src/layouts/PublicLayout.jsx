import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { Home, Wrench, FileText, LogIn, LogOut, Menu, X } from 'lucide-react'
import { translate } from '../i18n'
import PageLoader from '../components/ui/PageLoader'
import BrandMark from '../components/ui/BrandMark'
import { spring } from '../components/ui/motion'
import { useAuth } from '../hooks/useAuth'
import Footer from '../Footer'
import './PublicLayout.css'

function getInitial(name) {
  return (name || '').trim().charAt(0) || '?'
}

function PublicLayout() {
  const { user, isAuthenticated, signOut } = useAuth()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(location.pathname)
  const menuButtonRef = useRef(null)
  const drawerRef = useRef(null)

  useMotionValueEvent(scrollY, 'change', (y) => setIsScrolled(y > 12))

  // إغلاق القائمة عند تغيّر المسار
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname)
    setIsMenuOpen(false)
  }

  // قفل التمرير + Escape + نقل التركيز داخل القائمة
  useEffect(() => {
    if (!isMenuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const menuButton = menuButtonRef.current
    drawerRef.current?.querySelector('a, button')?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
      menuButton?.focus()
    }
  }, [isMenuOpen])

  const navItems = [
    { value: '/home', label: translate('nav.home'), Icon: Home },
    { value: '/artisans', label: translate('nav.artisans'), Icon: Wrench },
  ]

  if (isAuthenticated && user.role === 'resident') {
    navItems.push({ value: '/my-requests', label: translate('nav.myRequests'), Icon: FileText })
  }

  const activeValue = navItems.find((item) => location.pathname.startsWith(item.value))?.value

  const userSection = isAuthenticated ? (
    <>
      <span className="pl-user">
        <span className="pl-avatar" aria-hidden="true">
          {getInitial(user.fullName)}
        </span>
        <span className="pl-user-name">{user.fullName}</span>
      </span>
      <button type="button" className="fx-btn fx-btn--ghost fx-btn--sm pl-logout" onClick={signOut}>
        <LogOut size={15} aria-hidden="true" />
        {translate('nav.logout')}
      </button>
    </>
  ) : (
    <Link to="/login" className="fx-btn fx-btn--dark fx-btn--sm">
      <LogIn size={15} aria-hidden="true" />
      {translate('nav.login')}
    </Link>
  )

  return (
    <div className="public-layout">
      <a href="#main-content" className="pl-skip">
        {translate('nav.skipToContent')}
      </a>

      <header className={`pl-header ${isScrolled ? 'is-scrolled' : ''}`}>
        <div className="pl-bar fx-glass">
          <Link to="/home" className="pl-brand" aria-label={translate('common.brand')}>
            <BrandMark />
          </Link>

          <nav className="pl-nav" aria-label={translate('nav.mainNav')}>
            {navItems.map(({ value, label, Icon }) => {
              const isActive = value === activeValue
              return (
                <Link
                  key={value}
                  to={value}
                  className={`pl-nav-link ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="pl-nav-pill"
                      className="pl-nav-pill"
                      transition={reduceMotion ? { duration: 0 } : spring}
                    />
                  )}
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="pl-user-section">{userSection}</div>

          <button
            ref={menuButtonRef}
            type="button"
            className="fx-btn fx-btn--secondary fx-btn--icon pl-menu-button"
            aria-label={translate(isMenuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
            aria-expanded={isMenuOpen}
            aria-controls="pl-drawer"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              className="pl-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              id="pl-drawer"
              className="pl-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={translate('nav.menu')}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : spring}
            >
              <div className="pl-drawer-head">
                <BrandMark />
                <button
                  type="button"
                  className="fx-btn fx-btn--ghost fx-btn--icon"
                  aria-label={translate('nav.closeMenu')}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <nav className="pl-drawer-nav" aria-label={translate('nav.mainNav')}>
                {navItems.map(({ value, label, Icon }, index) => {
                  const isActive = value === activeValue
                  return (
                    <motion.div
                      key={value}
                      initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduceMotion ? 0 : 0.05 + index * 0.05, ...spring }}
                    >
                      <Link
                        to={value}
                        className={`pl-drawer-link ${isActive ? 'is-active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="pl-drawer-icon">
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        {label}
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              <div className="pl-drawer-user">{userSection}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main id="main-content" className="public-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}

export default PublicLayout
