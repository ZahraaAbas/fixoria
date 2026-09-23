import { users as mockUsers } from '../mocks/users'

const STORAGE_KEY = 'fixoria_registered_users'

function readRegisteredUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeRegisteredUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  } catch {
    // التخزين غير متاح: لن تُحفظ التغييرات بعد إغلاق الصفحة
  }
}

export function getAllUsers() {
  const registered = readRegisteredUsers()
  const registeredIds = new Set(registered.map((user) => user.id))
  const baseUsers = mockUsers.filter((user) => !registeredIds.has(user.id))
  return [...baseUsers, ...registered]
}

export function addUser(user) {
  const registeredUsers = readRegisteredUsers()
  writeRegisteredUsers([...registeredUsers, user])
}

export function updateUser(id, changes) {
  const registeredUsers = readRegisteredUsers()
  const index = registeredUsers.findIndex((user) => user.id === id)

  if (index !== -1) {
    const updated = { ...registeredUsers[index], ...changes }
    registeredUsers[index] = updated
    writeRegisteredUsers(registeredUsers)
    return updated
  }

  // أول تعديل على حساب تجريبي ثابت: نحوّله إلى نسخة محفوظة فعليًا تحل محل الأصل
  const baseUser = mockUsers.find((user) => user.id === id)
  if (!baseUser) return null

  const updated = { ...baseUser, ...changes }
  writeRegisteredUsers([...registeredUsers, updated])
  return updated
}

export function withoutPassword(user) {
  const copy = { ...user }
  delete copy.password
  return copy
}