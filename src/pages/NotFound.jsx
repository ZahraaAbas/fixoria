import { Link } from 'react-router'
import { translate } from '../i18n'

function NotFound() {
  return (
    <main className="not-found">
      <h1>{translate('notFound.title')}</h1>
      <Link to="/">{translate('notFound.backHome')}</Link>
    </main>
  )
}

export default NotFound