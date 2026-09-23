import { updateUser, withoutPassword } from './userStore'

const MOCK_DELAY_MS = 600

export function updateArtisanProfile(id, changes) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const updated = updateUser(id, changes)
      if (!updated) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(withoutPassword(updated))
    }, MOCK_DELAY_MS)
  })
}