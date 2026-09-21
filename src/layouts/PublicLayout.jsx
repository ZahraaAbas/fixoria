import { Link, NavLink, Outlet } from 'react-router'
import { translate } from '../i18n'
import './PublicLayout.css'

function PublicLayout() {
  return (
    <div className="public-layout">
      <header className="public-header">
        <Link to="/home" className="public-brand">
          {translate('common.brand')}
        </Link>
        <nav className="public-nav">
          <NavLink to="/home">{translate('nav.home')}</NavLink>
          <NavLink to="/login">{translate('nav.login')}</NavLink>
        </nav>
      </header>

      <main className="public-content">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout