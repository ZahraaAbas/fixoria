import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { UserGroupIcon, ClipboardListIcon, LayoutGridIcon, StarIcon } from '@hugeicons/core-free-icons'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import BranchedMenu from '../components/BranchedMenu'
import './AdminLayout.css'

function AdminLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const menuItems = [
    { value: '/admin/dashboard', label: translate('adminNav.dashboard') },
    {
      label: translate('adminNav.management'),
      children: [
        { value: '/admin/artisans', label: translate('adminNav.artisans'), icon: UserGroupIcon },
        { value: '/admin/requests', label: translate('adminNav.requests'), icon: ClipboardListIcon },
        { value: '/admin/categories', label: translate('adminNav.categories'), icon: LayoutGridIcon },
        { value: '/admin/reviews', label: translate('adminNav.reviews'), icon: StarIcon },
      ],
    },
  ]

  const flatValues = menuItems.flatMap((item) =>
    item.children ? item.children.map((kid) => kid.value) : [item.value],
  )
  const activeValue =
    flatValues.find((value) => location.pathname.startsWith(value)) ?? '/admin/dashboard'
  const activeGroupIndex = menuItems.findIndex((item) =>
    item.children?.some((kid) => kid.value === activeValue),
  )

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/admin/dashboard" className="admin-brand">
          {translate('common.brand')}
        </Link>

        {/* المكوّن مبني أصلًا لاتجاه LTR (خط الشجرة وأماكن النص)، فنعزله بـ dir="ltr" حتى يرسم صح */}
        <div className="admin-menu-wrapper" dir="ltr">
          <BranchedMenu
            items={menuItems}
            defaultOpen={activeGroupIndex >= 0 ? activeGroupIndex : 0}
            defaultActive={activeValue}
            onSelect={(value) => navigate(value)}
            color="rgba(255,255,255,0.9)"
            accentColor="#f19035"
            lineColor="rgba(255,255,255,0.22)"
            width={190}
          />
        </div>

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
