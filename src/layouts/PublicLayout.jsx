import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Home, Wrench, FileText } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import RubberSegment from '../components/RubberSegment'
import Footer from '../Footer'
import './PublicLayout.css'

function PublicLayout() {
  const { user, isAuthenticated, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { value: '/home', label: translate('nav.home'), icon: <Home size={16} /> },
    { value: '/artisans', label: translate('nav.artisans'), icon: <Wrench size={16} /> },
  ]

  if (isAuthenticated && user.role === 'resident') {
    navItems.push({
      value: '/my-requests',
      label: translate('nav.myRequests'),
      icon: <FileText size={16} />,
    })
  }

  const activeValue =
    navItems.find((item) => location.pathname.startsWith(item.value))?.value ?? navItems[0].value

  return (
    <div className="public-layout">
      <header className="public-header">
        <Link to="/home" className="public-brand">
          {translate('common.brand')}
        </Link>

        <div className="nav-segment-wrapper">
          <RubberSegment
            items={navItems}
            value={activeValue}
            onChange={(path) => navigate(path)}
            trackColor="#eef1f5"
            thumbColor="#ffffff"
            textColor="#334155"
            activeTextColor="#263056"
            size="lg"
            aria-label={translate('nav.home')}
          />
        </div>

        <div className="public-user-section">
          {isAuthenticated ? (
            <>
              <span className="public-user">{user.fullName}</span>
              <button type="button" className="public-logout" onClick={signOut}>
                {translate('nav.logout')}
              </button>
            </>
          ) : (
            <Link to="/login">{translate('nav.login')}</Link>
          )}
        </div>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}

export default PublicLayout