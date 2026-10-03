import { apiFetch } from './api'

// "التصنيفات" بالفرونت = "الخدمات" (Service) بالباكند
function toCategory(service) {
  return {
    id: service.id,
    name: service.name,
    icon: service.icon,
    description: service.description,
  }
}

export async function getCategories() {
  const services = await apiFetch('/services', { auth: false })
  return services.map(toCategory)
}

export async function getCategoryById(id) {
  const categories = await getCategories()
  const category = categories.find((item) => item.id === Number(id))
  if (!category) throw new Error('NOT_FOUND')
  return category
}
