import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, canAccess } = useAuth()
  const location = useLocation()

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but no access to this route → redirect to first allowed page
  if (!canAccess(location.pathname)) {
    const fallback = user.role === 'UPLOADER' ? '/upload' : '/'
    return <Navigate to={fallback} replace />
  }

  return children
}
