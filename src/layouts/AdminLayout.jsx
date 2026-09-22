import { Link, NavLink, Outlet } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import './AdminLayout.css'

function AdminLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/home" className="admin-brand">
          {translate('common.brand')}
        </Link>

        <nav className="admin-nav">
          <NavLink to="/admin/artisans">{translate('adminNav.artisans')}</NavLink>
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