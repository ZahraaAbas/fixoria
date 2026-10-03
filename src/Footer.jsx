import { Link } from 'react-router'
import { translate } from './i18n'
import BrandMark from './components/ui/BrandMark'
import './Footer.css'

function Footer() {
  const columns = [
    {
      title: translate('footer.linksTitle'),
      links: [
        { to: '/home', label: translate('footer.home') },
        { to: '/artisans', label: translate('footer.artisans') },
        { to: '/about', label: translate('about.title') },
        { to: '/contact', label: translate('contact.title') },
      ],
    },
    {
      title: translate('footer.accountTitle'),
      links: [
        { to: '/login', label: translate('footer.residentLogin') },
        { to: '/register', label: translate('footer.residentRegister') },
        { to: '/artisan/login', label: translate('footer.artisanLogin') },
        { to: '/artisan/register', label: translate('footer.artisanRegister') },
      ],
    },
  ]

  return (
    <footer className="app-footer">
      <div className="footer-panel">
        <span className="footer-glow" aria-hidden="true" />
        <span className="footer-wordmark" aria-hidden="true">
          {translate('common.brand')}
        </span>

        <div className="footer-content">
          <div className="footer-brand">
            <BrandMark tone="light" size="lg" />
            <p className="footer-desc">{translate('footer.description')}</p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} className="footer-column" aria-label={column.title}>
              <p className="footer-heading">{column.title}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            {translate('footer.compound')} · &copy; {new Date().getFullYear()} {translate('common.brand')} —{' '}
            {translate('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
