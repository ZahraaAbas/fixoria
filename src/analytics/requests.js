// حسابات التحليلات من نفس سجلات الطلبات الي تشوفها الواجهة (بدون أرقام وهمية).
// كل الدوال صافية: تاخذ قائمة طلبات (من mapAdminRequest) وترجع أرقام، والواجهة بس تعرضها.
import { parseApiDate } from '../utils/formatDate'

const DAY = 24 * 60 * 60 * 1000

export const RANGE_PRESETS = ['7', '30', '90']
export const DEFAULT_RANGE = '30'

// مجموعات الحالات: مفتوح (بانتظار حرفي)، نشط (مقبول أو قيد التنفيذ)، مكتمل، مغلق بدون إنجاز
export const STATUS_GROUPS = {
  pending: ['pending'],
  active: ['accepted', 'in_progress'],
  completed: ['completed'],
  closed: ['cancelled', 'rejected'],
}
export const STATUS_ORDER = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected']

// أقل عدد طلبات حتى نطلع ملاحظة أو نسبة (أقل من هيج النسب تضلّل)
export const MIN_SAMPLE = 5

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseInputDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// يحول الفترة المختارة لحدود: [start, end) والفترة السابقة بنفس الطول قبلها مباشرة
export function resolveRange({ preset = DEFAULT_RANGE, from, to } = {}, now = new Date()) {
  let start
  let end
  if (preset === 'custom') {
    const fromDate = parseInputDate(from)
    const toDate = parseInputDate(to)
    if (fromDate && toDate && fromDate <= toDate) {
      start = fromDate
      end = new Date(toDate.getTime() + DAY)
    }
  }
  if (!start) {
    const days = Number(RANGE_PRESETS.includes(preset) ? preset : DEFAULT_RANGE)
    end = new Date(startOfDay(now).getTime() + DAY)
    start = new Date(end.getTime() - days * DAY)
    preset = String(days)
  }
  const length = end.getTime() - start.getTime()
  return {
    preset,
    start,
    end,
    days: Math.round(length / DAY),
    prevStart: new Date(start.getTime() - length),
    prevEnd: start,
  }
}

export function createdAt(request) {
  return request.createdAt ? parseApiDate(request.createdAt) : null
}

export function inWindow(request, start, end) {
  const date = createdAt(request)
  return Boolean(date) && date >= start && date < end
}

export function splitByRange(requests, range) {
  return {
    current: requests.filter((r) => inWindow(r, range.start, range.end)),
    previous: requests.filter((r) => inWindow(r, range.prevStart, range.prevEnd)),
  }
}

export function countByStatus(requests) {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]))
  for (const r of requests) counts[r.status] = (counts[r.status] || 0) + 1
  return counts
}

export function countGroup(counts, group) {
  return STATUS_GROUPS[group].reduce((sum, s) => sum + (counts[s] || 0), 0)
}

// التغيير عن الفترة السابقة كنسبة: null إذا الفترة السابقة أقل من MIN_SAMPLE
// (نسبة من رقم صغير مثل 2 ← 18 = +800% تضلّل، فنعرض الرقم السابق نفسه بدالها)
export function change(current, previous) {
  if (!previous || previous < MIN_SAMPLE) return null
  return Math.round(((current - previous) / previous) * 100)
}

function visibleRating(request) {
  return request.review && !request.review.isHidden ? request.review.rating : null
}

export function averageRating(requests) {
  const ratings = requests.map(visibleRating).filter((r) => r != null)
  if (ratings.length === 0) return { average: null, count: 0 }
  const average = ratings.reduce((a, b) => a + b, 0) / ratings.length
  return { average: Math.round(average * 10) / 10, count: ratings.length }
}

// أكثر الخدمات طلبًا: ترتيب + حصة + مقارنة + حالات كل خدمة
export function rankServices(current, previous) {
  const byId = new Map()
  const entry = (r) => {
    if (!byId.has(r.serviceId)) {
      byId.set(r.serviceId, { serviceId: r.serviceId, name: r.categoryName, count: 0, prevCount: 0, statuses: countByStatus([]), requests: [] })
    }
    return byId.get(r.serviceId)
  }
  for (const r of current) {
    const e = entry(r)
    e.count += 1
    e.statuses[r.status] = (e.statuses[r.status] || 0) + 1
    e.requests.push(r)
  }
  for (const r of previous) entry(r).prevCount += 1

  const total = current.length
  return [...byId.values()]
    .filter((e) => e.count > 0 || e.prevCount > 0)
    .map((e) => ({
      ...e,
      share: total ? Math.round((e.count / total) * 100) : 0,
      change: change(e.count, e.prevCount),
      completed: e.statuses.completed,
      cancelled: e.statuses.cancelled + e.statuses.rejected,
      rating: averageRating(e.requests),
    }))
    .sort((a, b) => b.count - a.count || b.prevCount - a.prevCount || a.name.localeCompare(b.name))
}

// الطلبات حسب المجمع (الشركة تشتغل بأكثر من مجمع)
export function groupByCompound(requests) {
  const byId = new Map()
  for (const r of requests) {
    const key = r.compoundId ?? 'none'
    if (!byId.has(key)) byId.set(key, { compoundId: r.compoundId, name: r.compoundName, count: 0, active: 0, completed: 0 })
    const e = byId.get(key)
    e.count += 1
    if (STATUS_GROUPS.active.includes(r.status)) e.active += 1
    if (r.status === 'completed') e.completed += 1
  }
  return [...byId.values()].sort((a, b) => b.count - a.count)
}

function dayKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// سلسلة زمنية: يومية للفترات القصيرة، أسبوعية للأطول (حتى الرسم يبقى مقروء)
export function timeSeries(requests, range) {
  const step = range.days > 45 ? 7 : 1
  const buckets = []
  for (let t = range.start.getTime(); t < range.end.getTime(); t += step * DAY) {
    buckets.push({ start: new Date(t), key: dayKey(new Date(t)), created: 0, completed: 0 })
  }
  const indexOf = (date) => Math.floor((date.getTime() - range.start.getTime()) / (step * DAY))
  for (const r of requests) {
    const created = createdAt(r)
    if (created && created >= range.start && created < range.end) buckets[indexOf(created)].created += 1
    const done = r.completedAt ? parseApiDate(r.completedAt) : null
    if (done && done >= range.start && done < range.end) buckets[indexOf(done)].completed += 1
  }
  return { step, buckets }
}

// أوقات الذروة: حسب يوم الأسبوع (0 = الأحد) وحسب فترة اليوم
export function peakTimes(requests) {
  const weekdays = Array(7).fill(0)
  const dayparts = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const r of requests) {
    const date = createdAt(r)
    if (!date) continue
    weekdays[date.getDay()] += 1
    const h = date.getHours()
    dayparts[h >= 6 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'] += 1
  }
  return { weekdays, dayparts }
}

// أداء الحرفيين ضمن نطاق الشركة (الطلبات المسندة إلهم بالفترة)
export function artisanPerformance(requests) {
  const byId = new Map()
  for (const r of requests) {
    if (r.artisanId == null) continue
    if (!byId.has(r.artisanId)) byId.set(r.artisanId, { artisanId: r.artisanId, name: r.artisanName, assigned: 0, active: 0, completed: 0, requests: [] })
    const e = byId.get(r.artisanId)
    e.assigned += 1
    if (STATUS_GROUPS.active.includes(r.status)) e.active += 1
    if (r.status === 'completed') e.completed += 1
    e.requests.push(r)
  }
  return [...byId.values()]
    .map(({ requests: list, ...e }) => ({ ...e, rating: averageRating(list) }))
    .sort((a, b) => b.completed - a.completed || b.assigned - a.assigned)
}

// ملاحظات مؤكدة من الأرقام نفسها — كل وحدة إلها مفتاح نص ومعاملات ورابط للتفاصيل
export function buildInsights({ current, previous, services }) {
  const insights = []
  const total = current.length

  if (total >= MIN_SAMPLE && services[0]?.count > 0) {
    const top = services[0]
    insights.push({ key: 'topService', params: { service: top.name, count: top.count, share: top.share }, filter: { service: top.serviceId } })
  }

  const volume = change(total, previous.length)
  if (volume != null && previous.length >= MIN_SAMPLE && Math.abs(volume) >= 10) {
    insights.push({ key: volume > 0 ? 'volumeUp' : 'volumeDown', params: { pct: Math.abs(volume), current: total, previous: previous.length } })
  }

  const pending = current.filter((r) => r.status === 'pending').length
  if (total >= MIN_SAMPLE && pending / total >= 0.3) {
    insights.push({ key: 'pendingShare', params: { count: pending, share: Math.round((pending / total) * 100) }, filter: { status: 'pending' }, tone: 'warning' })
  }

  const growing = services
    .filter((s) => s.prevCount >= MIN_SAMPLE && s.change != null && s.change >= 25)
    .sort((a, b) => b.change - a.change)[0]
  if (growing) {
    insights.push({ key: 'fastestGrowing', params: { service: growing.name, pct: growing.change }, filter: { service: growing.serviceId } })
  }

  const cancelHeavy = services
    .filter((s) => s.count >= MIN_SAMPLE && s.cancelled / s.count >= 0.25)
    .sort((a, b) => b.cancelled / b.count - a.cancelled / a.count)[0]
  if (cancelHeavy) {
    insights.push({
      key: 'highCancellation',
      params: { service: cancelHeavy.name, share: Math.round((cancelHeavy.cancelled / cancelHeavy.count) * 100) },
      filter: { service: cancelHeavy.serviceId, status: 'closed' },
      tone: 'warning',
    })
  }
  return insights
}
