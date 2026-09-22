import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'

function RequireAuth({ role, children }) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/home" replace />
  }

  return children
}

export default RequireAuth