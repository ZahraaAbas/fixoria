import { apiPost } from './apiClient'
import { createResidentRequest } from './requestsService'

// المساعد الذكي (من فرع BackendChatbot) — POST /ai/service-request
// يرجّع مسودة طلب فقط ولا ينشئ حجزًا؛ الحجز يصير بعد تأكيد الساكن عبر POST /resident/requests
export async function analyzeServiceRequest(message, history = []) {
  try {
    return await apiPost('/ai/service-request', { message, history })
  } catch (error) {
    if (error.status === 503) throw new Error('AI_UNAVAILABLE', { cause: error })
    if (error.status === 429) throw new Error('AI_RATE_LIMIT', { cause: error })
    throw error
  }
}

// الأولوية والتفاصيل ما عدهم عمود بقاعدة البيانات، فنضمّهم لنص الوصف حتى يوصلون للحرفي
// (نفس منطق AiAssistantModal الأصلي)
export function buildDraftDescription(draft, urgentLabel) {
  const parts = [draft.problem, ...(draft.additional_details || [])]
  if (draft.priority === 'urgent') parts.push(urgentLabel)
  return parts.filter(Boolean).join(' — ')
}

// تأكيد المسودة: نفس طلب الخدمة اليدوي، والبناية والشقة يكملها الخادم من ملف الساكن
export function confirmDraft(draft, { contactName, urgentLabel }) {
  const problem = (draft.problem || '').trim()
  return createResidentRequest({
    categoryId: draft.service_id,
    title: problem.length > 60 ? `${problem.slice(0, 57)}…` : problem,
    description: buildDraftDescription(draft, urgentLabel),
    contactName,
    preferredDate: draft.preferred_time || '',
  })
}
