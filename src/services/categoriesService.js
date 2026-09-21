import { categories } from '../mocks/categories'

const MOCK_DELAY_MS = 600

export function getCategories() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(categories), MOCK_DELAY_MS)
  })
}