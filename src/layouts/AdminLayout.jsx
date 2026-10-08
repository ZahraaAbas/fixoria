import { Suspense, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ClipboardList, LayoutDashboard, LayoutGrid, LogOut, Menu, Star, UserCog, Users, X } from 'lucide-react'
import { translate } from '../i18n'
import PageLoader from '../components/ui/PageLoader'
import BrandMark from '../components/ui/BrandMark'
import NotificationBell from '../components/ui/NotificationBell'
import { spring } from '../components/ui/motion'
import { useAuth } from '../hooks/useAuth'
import './AdminLayout.css'

const SECTIONS = [
  { items: [{ value: '/admin/dashboard', labelKey: 'adminNav.dashboard', Icon: LayoutDashboard }] },
  {
    titleKey: 'adminNav.management',
    items: [
      { value: '/admin/artisans', labelKey: 'adminNav.artisans', Icon: Users },
      { value: '/admin/requests', labelKey: 'adminNav.requests', Icon: ClipboardList },
      { value: '/admin/categories', labelKey: 'adminNav.categories', Icon: LayoutGrid },
      { value: '/admin/reviews', labelKey: 'adminNav.reviews', Icon: Star },
    ],
  },
  {
    titleKey: 'adminNav.accountSection',
    items: [{ value: '/admin/account', labelKey: 'adminNav.account', Icon: UserCog }],
  },
]

function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)
  const [openedFor, setOpenedFor] = useState(location.pathname)

  // إغلاق القائمة الجانبية (الجوال) عند تغيّر الصفحة
  if (openedFor !== location.pathname) {
    setOpenedFor(location.pathname)
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const allValues = SECTIONS.flatMap((section) => section.items.map((item) => item.value))
  const activeValue = allValues.find((value) => location.pathname.startsWith(value)) ?? '/admin/dashboard'

  return (
    <div className="admin-layout">
      <a href="#admin-main" className="pl-skip">
        {translate('nav.skipToContent')}
      </a>

      {/* شريط علوي للجوال فقط */}
      <header className="adm-topbar">
        <Link to="/admin/dashboard" aria-label={translate('common.brand')}>
          <BrandMark tone="light" />
        </Link>
        <div className="adm-actions">
          <NotificationBell className="adm-icon-button" />
          <button
            type="button"
            className="adm-icon-button"
            aria-label={translate(isOpen ? 'nav.closeMenu' : 'nav.openMenu')}
            aria-expanded={isOpen}
            aria-controls="adm-sidebar"
            onClick={() => setIsOpen((open) => !open)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="adm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside id="adm-sidebar" className={`adm-sidebar ${isOpen ? 'is-open' : ''}`}>
        <span className="adm-sidebar-glow" aria-hidden="true" />

        <div className="adm-sidebar-head">
          <Link to="/admin/dashboard" className="adm-brand" aria-label={translate('common.brand')}>
            <BrandMark tone="light" />
          </Link>
          <div className="adm-actions">
            <NotificationBell className="adm-icon-button adm-sidebar-bell" />
            <button
              type="button"
              className="adm-icon-button adm-close"
              aria-label={translate('nav.closeMenu')}
              onClick={() => setIsOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <p className="adm-console">
          <span className="adm-console-dot" aria-hidden="true" />
          {translate('adminNav.console')}
        </p>

        <nav className="adm-nav" aria-label={translate('adminNav.console')}>
          {SECTIONS.map((section, sectionIndex) => (
            <div key={section.titleKey ?? sectionIndex} className="adm-nav-section">
              {section.titleKey && <p className="adm-nav-title">{translate(section.titleKey)}</p>}
              {section.items.map(({ value, labelKey, Icon }) => {
                const isActive = value === activeValue
                return (
                  <Link
                    key={value}
                    to={value}
                    className={`adm-nav-link ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="adm-nav-pill"
                        className="adm-nav-pill"
                        transition={reduceMotion ? { duration: 0 } : spring}
                      />
                    )}
                    <span className="adm-nav-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    {translate(labelKey)}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="adm-user">
          <span className="adm-avatar" aria-hidden="true">
            {user.fullName?.trim().charAt(0)}
          </span>
          <span className="adm-user-name">{user.fullName}</span>
          <button
            type="button"
            className="adm-icon-button adm-logout"
            onClick={signOut}
            aria-label={translate('nav.logout')}
            title={translate('nav.logout')}
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main id="admin-main" className="admin-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

export default AdminLayout
