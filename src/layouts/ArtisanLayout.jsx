import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import RubberSegment from '../components/RubberSegment'
import './ArtisanLayout.css'

function ArtisanLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
     { value: '/artisan/dashboard', label: translate('artisanDashboard.title') },
    { value: '/artisan/requests', label: translate('artisanNav.requests') },
    { value: '/artisan/my-work', label: translate('artisanNav.myWork') },
    { value: '/artisan/reviews', label: translate('artisanNav.reviews') },
    { value: '/artisan/profile', label: translate('artisanNav.settings') },
  ]

  const activeValue =
    navItems.find((item) => location.pathname.startsWith(item.value))?.value ?? navItems[0].value

  return (
    <div className="artisan-layout">
      <header className="artisan-header">
        <Link to="/artisan/requests" className="artisan-brand">
          {translate('common.brand')}
        </Link>

        <div className="nav-segment-wrapper">
          <RubberSegment
            items={navItems}
            value={activeValue}
            onChange={(path) => navigate(path)}
            trackColor="rgba(255,255,255,0.08)"
            thumbColor="#f19035"
            textColor="rgba(253,243,238,0.8)"
            activeTextColor="#263056"
            size="lg"
            aria-label={translate('artisanNav.requests')}
          />
        </div>

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