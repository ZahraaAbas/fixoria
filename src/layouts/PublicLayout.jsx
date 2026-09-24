import { Outlet, Link, NavLink } from 'react-router'
import { Home, Wrench, FileText } from 'lucide-react'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import Footer from '../Footer'
import './PublicLayout.css'

function PublicLayout() {
  const { user, isAuthenticated, signOut } = useAuth()

  return (
    <div className="public-layout">
      <header className="public-header">
        <Link to="/home" className="public-brand">
          {translate('common.brand')}
        </Link>

        <nav className="public-nav">
          <NavLink to="/home">
            <Home size={16} /> {translate('nav.home')}
          </NavLink>
          <NavLink to="/artisans">
            <Wrench size={16} /> {translate('nav.artisans')}
          </NavLink>
          {isAuthenticated && user.role === 'resident' && (
            <NavLink to="/my-requests">
              <FileText size={16} /> {translate('nav.myRequests')}
            </NavLink>
          )}
        </nav>

        <div className="public-user-section">
          {isAuthenticated ? (
            <>
              <span className="public-user">{user.fullName}</span>
              <button type="button" className="public-logout" onClick={signOut}>
                {translate('nav.logout')}
              </button>
            </>
          ) : (
            <NavLink to="/login">{translate('nav.login')}</NavLink>
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
