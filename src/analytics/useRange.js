import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_RANGE, resolveRange } from './requests'

// الفترة المختارة تنحفظ بالرابط (?range=30 أو ?range=custom&from=…&to=…)
// حتى الأرقام والرسوم والروابط للتفاصيل كلها تشتغل على نفس الفترة
export function useRange() {
  const [params, setParams] = useSearchParams()
  const preset = params.get('range') || DEFAULT_RANGE
  const from = params.get('from') || ''
  const to = params.get('to') || ''

  const range = useMemo(() => resolveRange({ preset, from, to }), [preset, from, to])

  function setRange(next) {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        updated.set('range', next.preset)
        if (next.preset === 'custom') {
          updated.set('from', next.from || '')
          updated.set('to', next.to || '')
        } else {
          updated.delete('from')
          updated.delete('to')
        }
        return updated
      },
      { replace: true },
    )
  }

  return { range, preset, from, to, setRange }
}

// رابط لقائمة الطلبات بنفس الفترة + فلاتر إضافية (خدمة، حالة، مجمع)
export function requestsLink(base, range, filters = {}) {
  const params = new URLSearchParams()
  params.set('range', range.preset)
  if (range.preset === 'custom') {
    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    params.set('from', fmt(range.start))
    params.set('to', fmt(new Date(range.end.getTime() - 1)))
  }
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== '') params.set(key, value)
  }
  return `${base}?${params}`
}
