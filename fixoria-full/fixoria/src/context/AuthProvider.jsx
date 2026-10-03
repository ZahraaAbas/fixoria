import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './authContext'
import { AUTH_STORAGE_KEY, UNAUTHORIZED_EVENT } from '../services/api'

function readStoredUser() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    const user = stored ? JSON.parse(stored) : null
    // جلسات قديمة من أيام الـ mocks ما بيها token — نعتبرها منتهية
    return user?.token ? user : null
  } catch {
    return null
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  function signIn(nextUser) {
    setUser(nextUser)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // التخزين غير متاح: يبقى المستخدم مسجّلًا حتى إغلاق الصفحة فقط
    }
  }

  const signOut = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
      // التخزين غير متاح: لا شيء نحذفه
    }
  }, [])

  // التوكن انتهى (الباكند رجّع 401) → نسجّل الخروج تلقائياً
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut)
  }, [signOut])

  const value = { user, isAuthenticated: Boolean(user), signIn, signOut }

  return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider
