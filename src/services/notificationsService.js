import { apiGet, apiPut } from './apiClient'

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || '',
    requestId: row.request_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

// آخر الإشعارات للمستخدم الحالي (GET /notifications)
export async function getNotifications({ limit = 20 } = {}) {
  const rows = await apiGet(`/notifications?limit=${limit}`)
  return rows.map(mapNotification)
}

// عدد غير المقروءة للرقم على الجرس (GET /notifications/unread-count)
export async function getUnreadCount() {
  const data = await apiGet('/notifications/unread-count')
  return data.unread
}

export function markNotificationRead(id) {
  return apiPut(`/notifications/${id}/read`)
}

export function markAllNotificationsRead() {
  return apiPut('/notifications/read-all')
}
