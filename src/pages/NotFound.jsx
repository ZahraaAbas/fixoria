import { Link } from 'react-router'
import { translate } from '../i18n'
import './NotFound.css'

function NotFound() {
  return (
    <main className="not-found">
      <p className="not-found-code">404</p>
      <h1>{translate('notFound.title')}</h1>
      <Link to="/" className="not-found-link">
        {translate('notFound.backHome')}
      </Link>
    </main>
  )
}

export default NotFound
