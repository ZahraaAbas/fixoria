import { useState } from 'react'
import { AuthContext } from './authContext'
import { setToken } from '../services/apiClient'

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

  function persist(nextUser) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // التخزين غير متاح: يبقى المستخدم مسجّلًا حتى إغلاق الصفحة فقط
    }
  }

  function signIn(nextUser) {
    setUser(nextUser)
    persist(nextUser)
  }

  function signOut() {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // التخزين غير متاح: لا شيء نحذفه
    }
  }

  function updateUser(changes) {
    setUser((current) => {
      const updated = { ...current, ...changes }
      persist(updated)
      return updated
    })
  }

  const value = { user, isAuthenticated: Boolean(user), signIn, signOut, updateUser }

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider