import { getAllUsers, withoutPassword } from './userStore'
import { categories } from '../mocks/categories'

const MOCK_DELAY_MS = 600

function categoryNamesFor(categoryIds = []) {
  return categories
    .filter((category) => categoryIds.includes(category.id))
    .map((category) => category.name)
}

function toPublicArtisan(user) {
  const publicUser = withoutPassword(user)
  const copy = { ...publicUser, categoryNames: categoryNamesFor(publicUser.categoryIds) }
  delete copy.categoryIds
  return copy
}

function approvedArtisans() {
  return getAllUsers().filter(
    (user) => user.role === 'artisan' && user.status === 'approved',
  )
}

export function getArtisans() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(approvedArtisans().map(toPublicArtisan)), MOCK_DELAY_MS)
  })
}

export function getArtisanById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const artisan = approvedArtisans().find((user) => user.id === Number(id))
      if (!artisan) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(toPublicArtisan(artisan))
    }, MOCK_DELAY_MS)
  })
}