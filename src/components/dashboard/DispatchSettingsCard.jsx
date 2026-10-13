import { useState } from 'react'
import { CircleCheck, Route, Users, UserCog } from 'lucide-react'
import { translate } from '../../i18n'
import { updateDispatchSettings } from '../../services/companyService'
import ActionError from '../ui/ActionError'
import './Dashboard.css'

const MINUTES = [15, 30, 60, 120]
const MODES = [
  { value: 'open', Icon: Users },
  { value: 'company', Icon: UserCog },
]

// طريقة توزيع طلبات الشركة: الحرفيين يقبلون مباشرة، أو المدير يوزّع خلال مهلة وبعدها تنفتح للحرفيين
function DispatchSettingsCard({ mode, minutes, onSaved }) {
  const [draft, setDraft] = useState({ mode, minutes })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const changed = draft.mode !== mode || draft.minutes !== minutes

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await updateDispatchSettings(draft)
      setSaved(true)
      onSaved?.()
    } catch {
      setError('common.actionError')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="chart-card fx-card ds" onSubmit={save} aria-labelledby="ds-title">
      <header className="chart-card-head">
        <div>
          <h2 id="ds-title" className="chart-card-title">
            <Route size={18} aria-hidden="true" className="cd-title-icon" />
            {translate('dispatch.title')}
          </h2>
          <p className="chart-card-subtitle">{translate('dispatch.subtitle')}</p>
        </div>
      </header>

      <fieldset className="ds-options">
        <legend className="sr-only">{translate('dispatch.title')}</legend>
        {MODES.map(({ value, Icon }) => (
          <label key={value} className={`ds-option ${draft.mode === value ? 'is-selected' : ''}`}>
            <input
              type="radio"
              name="dispatch-mode"
              value={value}
              checked={draft.mode === value}
              onChange={() => {
                setDraft((d) => ({ ...d, mode: value }))
                setSaved(false)
              }}
            />
            <span className="ds-option-icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="ds-option-text">
              <strong>{translate(`dispatch.modes.${value}.title`)}</strong>
              <span>{translate(`dispatch.modes.${value}.text`)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {draft.mode === 'company' && (
        <label className="ds-minutes">
          <span>{translate('dispatch.minutesLabel')}</span>
          <select
            className="fx-input"
            value={draft.minutes}
            onChange={(event) => {
              setDraft((d) => ({ ...d, minutes: Number(event.target.value) }))
              setSaved(false)
            }}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {translate('dispatch.minutesOption').replace('{n}', m)}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="ds-actions">
        <button type="submit" className="fx-btn fx-btn--primary fx-btn--sm" disabled={!changed || busy} data-loading={busy || undefined}>
          {translate('dispatch.save')}
        </button>
        {saved && (
          <p className="flash" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            {translate('dispatch.saved')}
          </p>
        )}
      </div>
      <ActionError messageKey={error} />
    </form>
  )
}

export default DispatchSettingsCard
