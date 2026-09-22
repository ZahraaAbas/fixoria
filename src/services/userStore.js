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
  return [...mockUsers, ...readRegisteredUsers()]
}

export function addUser(user) {
  const registeredUsers = readRegisteredUsers()
  writeRegisteredUsers([...registeredUsers, user])
}

export function updateUser(id, changes) {
  const registeredUsers = readRegisteredUsers()
  const index = registeredUsers.findIndex((user) => user.id === id)

  // ملاحظة: الحسابات التجريبية الثابتة (mocks/users.js) لا يمكن تعديلها،
  // لكنها جميعًا معتمدة مسبقًا أصلًا فلن نحتاج تعديلها عمليًا
  if (index === -1) return null

  const updated = { ...registeredUsers[index], ...changes }
  registeredUsers[index] = updated
  writeRegisteredUsers(registeredUsers)
  return updated
}

export function withoutPassword(user) {
  const copy = { ...user }
  delete copy.password
  return copy
}