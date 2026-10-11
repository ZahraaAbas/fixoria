// فلاتر وترتيب وتصدير قائمة الطلبات — كلها من الرابط حتى أي عرض ينشارك أو ينفتح من لوحة التحكم
import { parseApiDate } from '../utils/formatDate'
import { RANGE_PRESETS, resolveRange, STATUS_GROUPS } from './requests'

export const STATUS_OPTIONS = ['all', 'pending', 'active', 'accepted', 'in_progress', 'completed', 'closed', 'cancelled', 'rejected']
export const SORTS = ['date-desc', 'date-asc', 'id-desc', 'id-asc', 'status', 'service']
export const PAGE_SIZE = 15

export function readFilters(params) {
  const preset = params.get('range') || 'all'
  const isRange = preset === 'custom' || RANGE_PRESETS.includes(preset)
  const status = params.get('status') || 'all'
  const sort = params.get('sort')
  return {
    q: params.get('q') || '',
    status: STATUS_OPTIONS.includes(status) ? status : 'all',
    service: params.get('service') || '',
    compound: params.get('compound') || '',
    // artisan=none: بدون حرفي، أو رقم الحرفي
    artisan: params.get('artisan') || '',
    preset: isRange ? preset : 'all',
    from: params.get('from') || '',
    to: params.get('to') || '',
    range: isRange ? resolveRange({ preset, from: params.get('from'), to: params.get('to') }) : null,
    byCompleted: params.get('by') === 'completed',
    sort: SORTS.includes(sort) ? sort : 'date-desc',
    page: Math.max(1, Number(params.get('page')) || 1),
    open: params.get('open') || '',
  }
}

function statusMatches(status, filter) {
  if (filter === 'all') return true
  if (filter === 'active' || filter === 'closed') return STATUS_GROUPS[filter].includes(status)
  return status === filter
}

export function matchesFilters(request, f, { ignoreStatus = false } = {}) {
  if (!ignoreStatus && !statusMatches(request.status, f.status)) return false
  if (f.service && String(request.serviceId) !== f.service) return false
  if (f.compound && String(request.compoundId) !== f.compound) return false
  if (f.artisan === 'none' && request.artisanId != null) return false
  if (f.artisan && f.artisan !== 'none' && String(request.artisanId) !== f.artisan) return false
  if (f.range) {
    const value = f.byCompleted ? request.completedAt : request.createdAt
    if (!value) return false
    const date = parseApiDate(value)
    if (date < f.range.start || date >= f.range.end) return false
  }
  const term = f.q.trim().toLowerCase().replace(/^#/, '')
  if (term) {
    const haystack = [
      String(request.id),
      request.title,
      request.categoryName,
      request.residentName,
      request.artisanName,
      request.building,
      request.apartment,
      request.compoundName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(term)) return false
  }
  return true
}

const STATUS_RANK = { pending: 0, accepted: 1, in_progress: 2, completed: 3, cancelled: 4, rejected: 5 }

export function sortRequests(list, sort) {
  const time = (r) => (r.createdAt ? parseApiDate(r.createdAt).getTime() : 0)
  const sorted = [...list]
  const by = {
    'date-desc': (a, b) => time(b) - time(a),
    'date-asc': (a, b) => time(a) - time(b),
    'id-desc': (a, b) => b.id - a.id,
    'id-asc': (a, b) => a.id - b.id,
    status: (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || time(b) - time(a),
    service: (a, b) => (a.categoryName || '').localeCompare(b.categoryName || '') || time(b) - time(a),
  }[sort]
  return sorted.sort(by)
}

// CSV بترميز UTF-8 مع BOM حتى Excel يقرا العربي صح
export function toCsv(rows, columns) {
  const cell = (value) => {
    const text = value == null ? '' : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [columns.map((c) => cell(c.label)).join(','), ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(','))]
  return '\uFEFF' + lines.join('\r\n')
}
