import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ArrowDownUp, ChevronLeft, ChevronRight, ClipboardList, Download, Search, X } from 'lucide-react'
import { getCurrentLanguage, translate } from '../../i18n'
import { useLoader } from '../../hooks/useLoader'
import { matchesFilters, PAGE_SIZE, readFilters, sortRequests, STATUS_OPTIONS, toCsv } from '../../analytics/requestFilters'
import { RANGE_PRESETS } from '../../analytics/requests'
import { formatDate, parseApiDate } from '../../utils/formatDate'
import { ErrorState, EmptyState, SkeletonList } from '../StatusState'
import PageHeader from '../ui/PageHeader'
import StatusBadge from '../ui/StatusBadge'
import RequestDrawer from './RequestDrawer'
import './Requests.css'

function statusLabel(value) {
  return value === 'active' || value === 'closed' || value === 'all'
    ? translate(`requestsTable.status.${value}`)
    : translate(`requestStatus.${value}`)
}

function uniqueBy(list, idKey, nameKey) {
  const map = new Map()
  for (const item of list) if (item[idKey] != null && !map.has(item[idKey])) map.set(item[idKey], item[nameKey])
  return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

// عنوان عمود قابل للترتيب
function SortHeader({ sort, onSort, children }) {
  return (
    <th scope="col" aria-sort={sort}>
      <button type="button" className="rq-sort" onClick={onSort}>
        {children}
        <ArrowDownUp size={13} aria-hidden="true" className={sort !== 'none' ? 'is-active' : ''} />
      </button>
    </th>
  )
}

// مساحة عمل الطلبات: بحث وفلاتر وترتيب وتقسيم صفحات وتصدير، وتفاصيل كل طلب بلوحة جانبية.
// كل الحالة بالرابط، فأي رقم بلوحة التحكم يفتح نفس العرض بالضبط.
// drawerActions(request, patch): أدوات إضافية داخل لوحة التفاصيل (مثل تعيين حرفي للمشرف)
function RequestsWorkspace({ loader, titleKey, drawerActions }) {
  const [params, setParams] = useSearchParams()
  const f = useMemo(() => readFilters(params), [params])
  const { data, error, isLoading, retry } = useLoader(loader)
  // تعديلات محلية بعد أي إجراء، بدون إعادة تحميل القائمة
  const [patches, setPatches] = useState({})
  const requests = useMemo(() => (data || []).map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r)), [data, patches])
  const patch = useCallback((id, changes) => setPatches((current) => ({ ...current, [id]: { ...current[id], ...changes } })), [])

  const update = useCallback(
    (changes, { keepPage = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(changes)) {
            if (value == null || value === '' || value === 'all') next.delete(key)
            else next.set(key, value)
          }
          if (!keepPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const services = useMemo(() => uniqueBy(requests, 'serviceId', 'categoryName'), [requests])
  const compounds = useMemo(() => uniqueBy(requests, 'compoundId', 'compoundName'), [requests])
  const artisans = useMemo(() => uniqueBy(requests, 'artisanId', 'artisanName'), [requests])
  const scoped = useMemo(() => requests.filter((r) => matchesFilters(r, f, { ignoreStatus: true })), [requests, f])
  const filtered = useMemo(() => sortRequests(scoped.filter((r) => matchesFilters(r, f)), f.sort), [scoped, f])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(f.page, pages)
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const openRequest = f.open ? requests.find((r) => String(r.id) === f.open) : null
  const hasFilters = Boolean(f.q || f.status !== 'all' || f.service || f.compound || f.artisan || f.range)
  const closeDrawer = useCallback(() => update({ open: null }, { keepPage: true }), [update])

  function countFor(status) {
    return scoped.filter((r) => matchesFilters(r, { ...f, status, q: f.q })).length
  }

  function sortBy(column) {
    const map = { id: ['id-desc', 'id-asc'], date: ['date-desc', 'date-asc'], status: ['status'], service: ['service'] }
    const options = map[column]
    const nextSort = options.length > 1 && f.sort === options[0] ? options[1] : options[0]
    update({ sort: nextSort === 'date-desc' ? null : nextSort })
  }

  function ariaSort(column) {
    if (column === 'id' && f.sort.startsWith('id')) return f.sort === 'id-asc' ? 'ascending' : 'descending'
    if (column === 'date' && f.sort.startsWith('date')) return f.sort === 'date-asc' ? 'ascending' : 'descending'
    if (column === f.sort) return 'ascending'
    return 'none'
  }

  function exportCsv() {
    const location = (r) => [r.compoundName, r.building, r.apartment].filter(Boolean).join(' - ')
    const columns = [
      { label: translate('requestsTable.col.id'), value: (r) => r.id },
      { label: translate('requestsTable.col.title'), value: (r) => r.title || '' },
      { label: translate('requestsTable.col.service'), value: (r) => r.categoryName },
      { label: translate('requestsTable.col.status'), value: (r) => translate(`requestStatus.${r.status}`) },
      { label: translate('requestsTable.col.date'), value: (r) => (r.createdAt ? parseApiDate(r.createdAt).toISOString().slice(0, 16).replace('T', ' ') : '') },
      { label: translate('requestsTable.col.location'), value: location },
      { label: translate('requestsTable.col.resident'), value: (r) => r.residentName || '' },
      { label: translate('requestsTable.col.artisan'), value: (r) => r.artisanName || '' },
      { label: translate('requestsTable.col.price'), value: (r) => r.price ?? '' },
      { label: translate('requestsTable.col.payment'), value: (r) => (r.price == null ? '' : r.paymentStatus === 'paid' ? translate('payments.paid') : translate('payments.unpaidBadge')) },
      { label: translate('requestsTable.col.rating'), value: (r) => r.review?.rating ?? '' },
    ]
    const blob = new Blob([toCsv(filtered, columns)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `requests-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const isRtl = getCurrentLanguage() !== 'en'
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  return (
    <section className="rq">
      <PageHeader title={translate(titleKey)} meta={translate('requestsTable.subtitle')} />

      <div className="rq-toolbar fx-card">
        <label className="rq-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">{translate('requestsTable.search')}</span>
          <input
            type="search"
            className="fx-input"
            placeholder={translate('requestsTable.search')}
            value={f.q}
            onChange={(event) => update({ q: event.target.value })}
          />
        </label>

        <div className="rq-selects">
          <label>
            <span className="rq-select-label">{translate('requestsTable.statusLabel')}</span>
            <select className="fx-input" value={f.status} onChange={(event) => update({ status: event.target.value })}>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)} ({countFor(value)})
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="rq-select-label">{translate('requestsTable.serviceLabel')}</span>
            <select className="fx-input" value={f.service} onChange={(event) => update({ service: event.target.value })}>
              <option value="">{translate('requestsTable.allServices')}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="rq-select-label">{translate('requestsTable.artisanLabel')}</span>
            <select className="fx-input" value={f.artisan} onChange={(event) => update({ artisan: event.target.value })}>
              <option value="">{translate('requestsTable.allArtisans')}</option>
              <option value="none">{translate('requestsTable.unassigned')}</option>
              {artisans.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {compounds.length > 1 && (
            <label>
              <span className="rq-select-label">{translate('analytics.compoundFilter')}</span>
              <select className="fx-input" value={f.compound} onChange={(event) => update({ compound: event.target.value })}>
                <option value="">{translate('analytics.allCompounds')}</option>
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span className="rq-select-label">{translate('analytics.range.label')}</span>
            <select
              className="fx-input"
              value={f.preset}
              onChange={(event) => update({ range: event.target.value, from: null, to: null, by: null })}
            >
              <option value="all">{translate('requestsTable.allTime')}</option>
              {RANGE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {translate(`analytics.range.last${p}`)}
                </option>
              ))}
              {f.preset === 'custom' && <option value="custom">{`${f.from} — ${f.to}`}</option>}
            </select>
          </label>
        </div>

        <div className="rq-toolbar-foot">
          <p className="rq-count" role="status">
            {translate('requestsTable.count').replace('{n}', filtered.length).replace('{total}', requests.length)}
            {f.byCompleted && f.range && <span className="rq-hint"> · {translate('requestsTable.byCompleted')}</span>}
          </p>
          <div className="rq-toolbar-actions">
            {hasFilters && (
              <button
                type="button"
                className="fx-btn fx-btn--ghost fx-btn--sm"
                onClick={() => setParams({}, { replace: true })}
              >
                <X size={14} aria-hidden="true" />
                {translate('analytics.chips.clear')}
              </button>
            )}
            <button type="button" className="fx-btn fx-btn--secondary fx-btn--sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download size={14} aria-hidden="true" />
              {translate('requestsTable.export')}
            </button>
          </div>
        </div>
      </div>

      {isLoading && <SkeletonList count={4} />}
      {error && <ErrorState message={translate('adminRequests.error')} onRetry={retry} retryLabel={translate('adminRequests.retry')} />}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState icon={ClipboardList} title={translate(hasFilters ? 'requestsTable.emptyFiltered' : 'adminRequests.empty')} />
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="rq-table-card fx-card">
          <table className="rq-table">
            <thead>
              <tr>
                <SortHeader sort={ariaSort('id')} onSort={() => sortBy('id')}>{translate('requestsTable.col.id')}</SortHeader>
                <SortHeader sort={ariaSort('service')} onSort={() => sortBy('service')}>{translate('requestsTable.col.request')}</SortHeader>
                <SortHeader sort={ariaSort('date')} onSort={() => sortBy('date')}>{translate('requestsTable.col.date')}</SortHeader>
                <SortHeader sort={ariaSort('status')} onSort={() => sortBy('status')}>{translate('requestsTable.col.status')}</SortHeader>
                <th scope="col">{translate('requestsTable.col.artisan')}</th>
                <th scope="col">{translate('requestsTable.col.location')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`rq-tr rq-tr--${r.status}`} onClick={() => update({ open: r.id }, { keepPage: true })}>
                  <td data-label={translate('requestsTable.col.id')} className="rq-id">
                    #{r.id}
                  </td>
                  <td data-label={translate('requestsTable.col.request')}>
                    <button
                      type="button"
                      className="rq-open"
                      onClick={(event) => {
                        event.stopPropagation()
                        update({ open: r.id }, { keepPage: true })
                      }}
                    >
                      <span className="rq-open-title">{r.title || r.categoryName}</span>
                      <span className="rq-open-service">{r.categoryName}</span>
                    </button>
                  </td>
                  <td data-label={translate('requestsTable.col.date')} className="rq-date">
                    {r.createdAt ? formatDate(r.createdAt) : '—'}
                  </td>
                  <td data-label={translate('requestsTable.col.status')}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td data-label={translate('requestsTable.col.artisan')}>
                    {r.artisanName || <span className="rq-muted">{translate('requestsTable.unassigned')}</span>}
                  </td>
                  <td data-label={translate('requestsTable.col.location')} className="rq-location">
                    {[compounds.length > 1 ? r.compoundName : null, r.building, r.apartment].filter(Boolean).join(' · ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <nav className="rq-pager" aria-label={translate('requestsTable.pagination')}>
              <button
                type="button"
                className="fx-btn fx-btn--ghost fx-btn--sm"
                disabled={page <= 1}
                onClick={() => update({ page: page - 1 }, { keepPage: true })}
              >
                <PrevIcon size={15} aria-hidden="true" />
                {translate('requestsTable.prev')}
              </button>
              <span className="rq-pager-info">
                {translate('requestsTable.pageInfo')
                  .replace('{from}', (page - 1) * PAGE_SIZE + 1)
                  .replace('{to}', Math.min(page * PAGE_SIZE, filtered.length))
                  .replace('{total}', filtered.length)}
              </span>
              <button
                type="button"
                className="fx-btn fx-btn--ghost fx-btn--sm"
                disabled={page >= pages}
                onClick={() => update({ page: page + 1 }, { keepPage: true })}
              >
                {translate('requestsTable.next')}
                <NextIcon size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      )}

      <RequestDrawer
        request={openRequest}
        onClose={closeDrawer}
        actions={openRequest && drawerActions ? drawerActions(openRequest, (changes) => patch(openRequest.id, changes)) : null}
      />
    </section>
  )
}

export default RequestsWorkspace
