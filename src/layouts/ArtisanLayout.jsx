import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { Briefcase, Inbox, LayoutDashboard, LogOut, Star, UserCog } from 'lucide-react'
import { translate } from '../i18n'
import PageLoader from '../components/ui/PageLoader'
import BrandMark from '../components/ui/BrandMark'
import { spring } from '../components/ui/motion'
import { useAuth } from '../hooks/useAuth'
import './ArtisanLayout.css'

function ArtisanLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const navItems = [
    { value: '/artisan/dashboard', label: translate('artisanDashboard.title'), short: translate('artisanNav.shortDashboard'), Icon: LayoutDashboard },
    { value: '/artisan/requests', label: translate('artisanNav.requests'), short: translate('artisanNav.shortRequests'), Icon: Inbox },
    { value: '/artisan/my-work', label: translate('artisanNav.myWork'), short: translate('artisanNav.myWork'), Icon: Briefcase },
    { value: '/artisan/reviews', label: translate('artisanNav.reviews'), short: translate('artisanNav.reviews'), Icon: Star },
    { value: '/artisan/profile', label: translate('artisanNav.settings'), short: translate('artisanNav.shortSettings'), Icon: UserCog },
  ]

  const activeValue =
    navItems.find((item) => location.pathname.startsWith(item.value))?.value ?? navItems[0].value
  const pillTransition = reduceMotion ? { duration: 0 } : spring

  return (
    <div className="artisan-layout">
      <a href="#artisan-main" className="pl-skip">
        {translate('nav.skipToContent')}
      </a>

      <header className="al-header">
        <div className="al-bar">
          <Link to="/artisan/requests" className="al-brand" aria-label={translate('common.brand')}>
            <BrandMark tone="light" />
            <span className="al-workspace">{translate('artisanNav.workspace')}</span>
          </Link>

          <nav className="al-nav" aria-label={translate('artisanNav.workspace')}>
            {navItems.map(({ value, label, Icon }) => {
              const isActive = value === activeValue
              return (
                <Link
                  key={value}
                  to={value}
                  className={`al-nav-link ${isActive ? 'is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span layoutId="al-nav-pill" className="al-nav-pill" transition={pillTransition} />
                  )}
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="al-user">
            <span className="al-avatar" aria-hidden="true">
              {user.fullName?.trim().charAt(0)}
            </span>
            <span className="al-user-name">{user.fullName}</span>
            <button
              type="button"
              className="al-logout"
              onClick={signOut}
              aria-label={translate('nav.logout')}
              title={translate('nav.logout')}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="artisan-main" className="artisan-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      {/* شريط تبويب سفلي للجوال (أسلوب التطبيقات) */}
      <nav className="al-tabbar" aria-label={translate('artisanNav.workspace')}>
        {navItems.map(({ value, short, Icon }) => {
          const isActive = value === activeValue
          return (
            <Link
              key={value}
              to={value}
              className={`al-tab ${isActive ? 'is-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span layoutId="al-tab-pill" className="al-tab-pill" transition={pillTransition} />
              )}
              <Icon size={20} aria-hidden="true" />
              <span>{short}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export default ArtisanLayout
