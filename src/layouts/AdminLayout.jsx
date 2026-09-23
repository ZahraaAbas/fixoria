import { Link, NavLink, Outlet } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import './AdminLayout.css'

function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/admin/dashboard" className="admin-brand">
          {translate('common.brand')}
        </Link>

        <nav className="admin-nav">
          <NavLink to="/admin/dashboard">{translate('adminNav.dashboard')}</NavLink>
          <NavLink to="/admin/artisans">{translate('adminNav.artisans')}</NavLink>
          <NavLink to="/admin/requests">{translate('adminNav.requests')}</NavLink>
          <NavLink to="/admin/categories">{translate('adminNav.categories')}</NavLink>
          <NavLink to="/admin/reviews">{translate('adminNav.reviews')}</NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <span className="admin-user">{user.fullName}</span>
          <button type="button" className="admin-logout" onClick={signOut}>
            {translate('nav.logout')}
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout