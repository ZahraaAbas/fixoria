import { translate } from '../i18n'
import { useAuth } from '../hooks/useAuth'
import './ArtisanPending.css'

function ArtisanPending() {
  const { user, signOut } = useAuth()
  const isRejected = user?.status === 'rejected'

  return (
    <div className="artisan-pending">
      <h1>{translate(isRejected ? 'artisanPending.rejectedTitle' : 'artisanPending.title')}</h1>
      <p>
        {translate(
          isRejected ? 'artisanPending.rejectedDescription' : 'artisanPending.description',
        )}
      </p>
      {user?.fullName && <p className="artisan-pending-name">{user.fullName}</p>}
      <button type="button" className="artisan-pending-logout" onClick={signOut}>
        {translate('artisanPending.logout')}
      </button>
    </div>
  )
}

export default ArtisanPending