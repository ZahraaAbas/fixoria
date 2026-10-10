import { useCallback, useState } from 'react'
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

function persist(nextUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
  } catch {
    // التخزين غير متاح: يبقى المستخدم مسجّلًا حتى إغلاق الصفحة فقط
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  // دوال ثابتة (useCallback) حتى الصفحات تكدر تستخدمها بـ useEffect بدون ما يتكرر التنفيذ
  const signIn = useCallback((nextUser) => {
    setUser(nextUser)
    persist(nextUser)
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // التخزين غير متاح: لا شيء نحذفه
    }
  }, [])

  const updateUser = useCallback((changes) => {
    setUser((current) => {
      const updated = { ...current, ...changes }
      persist(updated)
      return updated
    })
  }, [])

  const value = { user, isAuthenticated: Boolean(user), signIn, signOut, updateUser }

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider