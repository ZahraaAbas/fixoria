import { Navigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'

const REDIRECT_BY_ROLE = {
  artisan: '/artisan/dashboard',
  admin: '/admin/dashboard',
}

function GuestOrResidentOnly({ children }) {
  const { user, isAuthenticated } = useAuth()

  if (isAuthenticated && user.role !== 'resident') {
    return <Navigate to={REDIRECT_BY_ROLE[user.role] || '/'} replace />
  }

  return children
}

export default GuestOrResidentOnly