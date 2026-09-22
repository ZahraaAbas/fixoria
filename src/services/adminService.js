import { getAllUsers, updateUser, withoutPassword } from './userStore'

const MOCK_DELAY_MS = 600

export function getArtisanAccounts() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const artisans = getAllUsers()
        .filter((user) => user.role === 'artisan')
        .map(withoutPassword)
      resolve(artisans)
    }, MOCK_DELAY_MS)
  })
}

export function approveArtisan(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const updated = updateUser(id, { status: 'approved' })
      if (!updated) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(withoutPassword(updated))
    }, MOCK_DELAY_MS)
  })
}

export function rejectArtisan(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const updated = updateUser(id, { status: 'rejected' })
      if (!updated) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(withoutPassword(updated))
    }, MOCK_DELAY_MS)
  })
}