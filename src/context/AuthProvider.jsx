import { useState } from 'react'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'fixoria_user'

function readStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  function signIn(nextUser) {
    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // التخزين غير متاح: يبقى المستخدم مسجّلًا حتى إغلاق الصفحة فقط
    }
  }

  function signOut() {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // التخزين غير متاح: لا شيء نحذفه
    }
  }

  const value = { user, isAuthenticated: Boolean(user), signIn, signOut }

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider