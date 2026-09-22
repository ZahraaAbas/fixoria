import { categories } from '../mocks/categories'

const MOCK_DELAY_MS = 600

export function getCategories() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(categories), MOCK_DELAY_MS)
  })
}

export function getCategoryById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const category = categories.find((item) => item.id === Number(id))
      if (!category) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(category)
    }, MOCK_DELAY_MS)
  })
}