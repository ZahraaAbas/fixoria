import { users } from '../mocks/users'

const MOCK_DELAY_MS = 600

export function login({ email, password }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const account = users.find(
        (user) =>
          user.email === email.trim().toLowerCase() &&
          user.password === password,
      )

      if (!account) {
        reject(new Error('INVALID_CREDENTIALS'))
        return
      }

      const user = { ...account }
      delete user.password
      resolve(user)
    }, MOCK_DELAY_MS)
  })
}