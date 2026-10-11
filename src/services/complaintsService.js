import { apiGet, apiPost, apiPut } from './apiClient'

// الشكاوى: الساكن يرسلها (اختياريًا عن طلب معيّن)، ومشرف مجمعه يتابعها ويرد

function mapComplaint(row) {
  return {
    id: row.id,
    residentName: row.customer_name,
    requestId: row.request_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    reply: row.admin_reply || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// الساكن: شكاواي وحالتها ورد الإدارة (GET /resident/complaints)
export async function getMyComplaints() {
  return (await apiGet('/resident/complaints')).map(mapComplaint)
}

// الساكن: إرسال شكوى — مشرفو المجمع يوصلهم إشعار (POST /resident/complaints)
export async function createComplaint({ requestId, subject, message }) {
  return mapComplaint(await apiPost('/resident/complaints', { request_id: requestId ?? null, subject, message }))
}

// المشرف: شكاوى سكان مجمعه (GET /admin/complaints)
export async function getComplaints() {
  return (await apiGet('/admin/complaints')).map(mapComplaint)
}

// المشرف: تغيير الحالة و/أو الرد — الساكن يوصله إشعار (PUT /admin/complaints/:id)
export async function updateComplaint(id, { status, reply }) {
  return mapComplaint(await apiPut(`/admin/complaints/${id}`, { status, admin_reply: reply }))
}
