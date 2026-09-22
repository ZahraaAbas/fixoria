import { Link, NavLink, Outlet } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
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
          <NavLink to="/home">{translate('nav.home')}</NavLink>
          <NavLink to="/artisans">{translate('nav.artisans')}</NavLink>

          {isAuthenticated ? (
            <>
              {user.role === 'resident' && (
                <NavLink to="/my-requests">{translate('nav.myRequests')}</NavLink>
              )}
              <span className="public-user">{user.fullName}</span>
              <button type="button" className="public-logout" onClick={signOut}>
                {translate('nav.logout')}
              </button>
            </>
          ) : (
            <NavLink to="/login">{translate('nav.login')}</NavLink>
          )}
        </nav>
      </header>

      <main className="public-content">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout