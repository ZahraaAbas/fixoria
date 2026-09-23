import { Link, NavLink, Outlet } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import './ArtisanLayout.css'

function ArtisanLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="artisan-layout">
      <header className="artisan-header">
        <Link to="/artisan/requests" className="artisan-brand">
          {translate('common.brand')}
        </Link>

        <nav className="artisan-nav">
          <NavLink to="/artisan/requests">{translate('artisanNav.requests')}</NavLink>
          <NavLink to="/artisan/my-work">{translate('artisanNav.myWork')}</NavLink>
          <NavLink to="/artisan/reviews">{translate('artisanNav.reviews')}</NavLink>
          <NavLink to="/artisan/profile">{translate('artisanNav.settings')}</NavLink>
        </nav>

        <div className="artisan-header-right">
          <span className="artisan-user">{user.fullName}</span>
          <button type="button" className="artisan-logout" onClick={signOut}>
            {translate('nav.logout')}
          </button>
        </div>
      </header>

      <main className="artisan-content">
        <Outlet />
      </main>
    </div>
  )
}

export default ArtisanLayout