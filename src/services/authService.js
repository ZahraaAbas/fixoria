import { users as mockUsers } from '../mocks/users'

const STORAGE_KEY = 'fixoria_registered_users'
const MOCK_DELAY_MS = 600

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
    // التخزين غير متاح: لن يُحفظ الحساب بعد إغلاق الصفحة
  }
}

function getAllUsers() {
  return [...mockUsers, ...readRegisteredUsers()]
}
function withoutPassword(user) {
  const copy = { ...user }
  delete copy.password
  return copy
}

export function login({ email, password }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const account = getAllUsers().find(
        (user) =>
          user.email === email.trim().toLowerCase() &&
          user.password === password,
      )

      if (!account) {
        reject(new Error('INVALID_CREDENTIALS'))
        return
      }

      resolve(withoutPassword(account))
    }, MOCK_DELAY_MS)
  })
}

function createAccount(payload) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const email = payload.email.trim().toLowerCase()
      const emailTaken = getAllUsers().some((user) => user.email === email)

      if (emailTaken) {
        reject(new Error('EMAIL_TAKEN'))
        return
      }

      const registeredUsers = readRegisteredUsers()
      const newUser = { id: Date.now(), ...payload, email }
      writeRegisteredUsers([...registeredUsers, newUser])
      resolve(withoutPassword(newUser))
    }, MOCK_DELAY_MS)
  })
}

export function registerResident(data) {
  return createAccount({
    fullName: data.fullName,
    phone: data.phone,
    building: data.building,
    apartment: data.apartment,
    email: data.email,
    password: data.password,
    role: 'resident',
  })
}

export function registerArtisan(data) {
  return createAccount({
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    password: data.password,
    role: 'artisan',
    categoryIds: data.categoryIds,
    bio: data.bio,
    status: 'pending',
  })
}