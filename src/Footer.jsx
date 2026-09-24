import { Link } from 'react-router'
import { translate } from './i18n'
import './Footer.css'

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-column footer-brand">
          <span className="footer-logo">🛠️ {translate('common.brand')}</span>
          <p className="footer-desc">{translate('footer.description')}</p>
        </div>

               <div className="footer-column">
          <p className="footer-heading">{translate('footer.linksTitle')}</p>
          <Link to="/home">{translate('footer.home')}</Link>
          <Link to="/artisans">{translate('footer.artisans')}</Link>
          <Link to="/about">{translate('about.title')}</Link>
          <Link to="/contact">{translate('contact.title')}</Link>
        </div>
        
        <div className="footer-column">
          <p className="footer-heading">{translate('footer.accountTitle')}</p>
          <Link to="/login">{translate('footer.residentLogin')}</Link>
          <Link to="/register">{translate('footer.residentRegister')}</Link>
          <Link to="/artisan/login">{translate('footer.artisanLogin')}</Link>
          <Link to="/artisan/register">{translate('footer.artisanRegister')}</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">
          {translate('footer.compound')} · &copy; {new Date().getFullYear()} Fixoria —{' '}
          {translate('footer.rights')}
        </p>
      </div>
    </footer>
  )
}

export default Footer