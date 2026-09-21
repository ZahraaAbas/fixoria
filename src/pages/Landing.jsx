import { Link } from 'react-router'
import { translate } from '../i18n'
import './Landing.css'

function Landing() {
  return (
    <main className="landing">
      <p className="landing-brand">{translate('landing.brand')}</p>

      <h1 className="landing-title">{translate('landing.title')}</h1>
      <p className="landing-description">{translate('landing.description')}</p>

      <nav className="landing-actions">
        <Link to="/login" className="landing-link">
          {translate('landing.residentLogin')}
        </Link>
        <Link to="/artisan/login" className="landing-link">
          {translate('landing.artisanLogin')}
        </Link>
        <Link to="/admin/login" className="landing-link">
          {translate('landing.adminLogin')}
        </Link>
        <Link to="/home" className="landing-link landing-link-guest">
          {translate('landing.guest')}
        </Link>
      </nav>
    </main>
  )
}

export default Landing