import { apiGet, apiPost, apiPut, apiDelete } from './apiClient'

function mapCategory(service) {
  return { id: service.id, name: service.name, icon: service.icon }
}

export function getCategories() {
  return apiGet('/services', { auth: false }).then((data) => data.map(mapCategory))
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
