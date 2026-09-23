import { categories as baseCategories } from '../mocks/categories'

const STORAGE_KEY = 'fixoria_categories'
const MOCK_DELAY_MS = 600

function readCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    return baseCategories
  }
  writeCategories(baseCategories)
  return baseCategories
}

function writeCategories(categories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // التخزين غير متاح: لن تُحفظ تعديلات التصنيفات بعد إغلاق الصفحة
  }
}

export function getCategories() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(readCategories()), MOCK_DELAY_MS)
  })
}

export function getCategoryById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const category = readCategories().find((item) => item.id === Number(id))
      if (!category) {
        reject(new Error('NOT_FOUND'))
        return
      }
      resolve(category)
    }, MOCK_DELAY_MS)
  })
}

export function addCategory(name) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const categories = readCategories()
      const newCategory = { id: Date.now(), name }
      writeCategories([...categories, newCategory])
      resolve(newCategory)
    }, MOCK_DELAY_MS)
  })
}

export function updateCategory(id, name) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const categories = readCategories()
      const index = categories.findIndex((item) => item.id === Number(id))
      if (index === -1) {
        reject(new Error('NOT_FOUND'))
        return
      }
      const updated = { ...categories[index], name }
      categories[index] = updated
      writeCategories(categories)
      resolve(updated)
    }, MOCK_DELAY_MS)
  })
}

export function deleteCategory(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const remaining = readCategories().filter((item) => item.id !== Number(id))
      writeCategories(remaining)
      resolve()
    }, MOCK_DELAY_MS)
  })
}