import { apiGet, apiPost, apiPut, apiDelete } from './apiClient'

function mapCategory(service) {
  return { id: service.id, name: service.name, icon: service.icon }
}

export function getCategories() {
  return apiGet('/services', { auth: false }).then((data) => data.map(mapCategory))
}

// خدمات مجمع الساكن بس (اللي تغطيها اتفاقياته) — للساكن المقبول
export function getResidentCategories() {
  return apiGet('/resident/service-categories').then((data) =>
    data.map((row) => ({ id: row.service_id, name: row.name, icon: row.icon })),
  )
}

export async function getResidentCategoryById(id) {
  const category = (await getResidentCategories()).find((item) => item.id === Number(id))
  if (!category) {
    throw new Error('NOT_FOUND')
  }
  return category
}

export async function getCategoryById(id) {
  const categories = await getCategories()
  const category = categories.find((item) => item.id === Number(id))
  if (!category) {
    throw new Error('NOT_FOUND')
  }
  return category
}

export function addCategory(name) {
  return apiPost('/services', { name }).then(mapCategory)
}

export function updateCategory(id, name) {
  return apiPut(`/services/${id}`, { name }).then(mapCategory)
}

export function deleteCategory(id) {
  return apiDelete(`/services/${id}`)
}
