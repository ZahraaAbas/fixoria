import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { translate } from '../../i18n'
import { RANGE_PRESETS } from '../../analytics/requests'
import { todayInputValue } from '../../utils/formatDate'
import './Dashboard.css'

// اختيار الفترة: ٧ / ٣٠ / ٩٠ يوم أو فترة مخصصة (من — إلى)
function DateRangeFilter({ preset, from, to, onChange }) {
  const [draft, setDraft] = useState({ from, to })
  const isCustom = preset === 'custom'
  const draftValid = draft.from && draft.to && draft.from <= draft.to

  return (
    <div className="dr" role="group" aria-label={translate('analytics.range.label')}>
      <CalendarRange size={16} aria-hidden="true" className="dr-icon" />
      <div className="dr-presets">
        {[...RANGE_PRESETS, 'custom'].map((value) => (
          <button
            key={value}
            type="button"
            className={`dr-preset ${preset === value ? 'is-active' : ''}`}
            aria-pressed={preset === value}
            onClick={() => (value === 'custom' ? onChange({ preset: 'custom', ...draft }) : onChange({ preset: value }))}
          >
            {translate(`analytics.range.${value === 'custom' ? 'custom' : `last${value}`}`)}
          </button>
        ))}
      </div>

      {isCustom && (
        <form
          className="dr-custom"
          onSubmit={(event) => {
            event.preventDefault()
            if (draftValid) onChange({ preset: 'custom', ...draft })
          }}
        >
          <label>
            <span className="sr-only">{translate('analytics.range.from')}</span>
            <input
              type="date"
              className="fx-input dr-date"
              value={draft.from}
              max={todayInputValue()}
              onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value }))}
              aria-label={translate('analytics.range.from')}
            />
          </label>
          <span aria-hidden="true">—</span>
          <label>
            <span className="sr-only">{translate('analytics.range.to')}</span>
            <input
              type="date"
              className="fx-input dr-date"
              value={draft.to}
              max={todayInputValue()}
              onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value }))}
              aria-label={translate('analytics.range.to')}
            />
          </label>
          <button type="submit" className="fx-btn fx-btn--dark fx-btn--sm" disabled={!draftValid}>
            {translate('analytics.range.apply')}
          </button>
        </form>
      )}
    </div>
  )
}

export default DateRangeFilter
