import { apiFetch } from './api'

// المساعد الذكي — POST /ai/service-request
// يرجّع مسودة طلب بس (ما ينشئ حجز)؛ الحجز الفعلي يصير بعد تأكيد الساكن عبر POST /resident/requests
export function analyzeServiceRequest(message, history = []) {
  return apiFetch('/ai/service-request', { method: 'POST', body: { message, history } })
}
