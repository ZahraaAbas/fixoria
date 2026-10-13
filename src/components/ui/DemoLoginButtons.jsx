import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Crown, Shield, UserCheck, Wrench, Zap } from 'lucide-react'
import { translate } from '../../i18n'
import { demoLogin } from '../../services/authService'
import { useAuth } from '../../hooks/useAuth'
import { landingFor } from '../../utils/afterLogin'
import ActionError from './ActionError'
import './DemoLoginButtons.css'

const ICONS = { resident: UserCheck, artisan: Wrench, admin: Shield, company: Building2, owner: Crown }

// وضع العرض: زر لكل دور يدخل مباشرة لحساب التجربة (بدون إيميل وكلمة سر).
// دور الشركة ويا أكثر من شركة: الزر يفتح قائمة الشركات وتختار وين تدخل.
function DemoLoginButtons({ roles, companies = [], onDone }) {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [pickCompany, setPickCompany] = useState(false)

  async function enter(role, companyId) {
    setBusy(companyId ? `company-${companyId}` : role)
    setError('')
    try {
      const user = await demoLogin(role, companyId)
      signIn(user)
      onDone?.()
      navigate(landingFor(user), { replace: true })
    } catch (err) {
      setError(err.message === 'NETWORK_ERROR' ? 'common.networkError' : 'demo.error')
      setBusy(null)
    }
  }

  return (
    <div className="dl">
      <p className="dl-badge">
        <Zap size={14} aria-hidden="true" />
        {translate('demo.badge')}
      </p>
      <div className="dl-grid">
        {roles.map((role) => {
          const Icon = ICONS[role] || UserCheck
          return (
            <button
              key={role}
              type="button"
              className={`dl-btn ${role === 'resident' ? 'dl-btn--primary' : ''}`}
              onClick={() =>
                role === 'company' && companies.length > 1 ? setPickCompany((open) => !open) : enter(role)
              }
              disabled={Boolean(busy)}
              data-loading={busy === role || undefined}
              aria-expanded={role === 'company' && companies.length > 1 ? pickCompany : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {translate(`demo.roles.${role}`)}
            </button>
          )
        })}
      </div>
      {pickCompany && (
        <div className="dl-companies">
          <p className="dl-companies-title">{translate('demo.pickCompany')}</p>
          <div className="dl-grid">
            {companies.map((company) => (
              <button
                key={company.id}
                type="button"
                className="dl-btn dl-btn--company"
                onClick={() => enter('company', company.id)}
                disabled={Boolean(busy)}
                data-loading={busy === `company-${company.id}` || undefined}
              >
                <Building2 size={16} aria-hidden="true" />
                {company.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <ActionError messageKey={error} />
    </div>
  )
}

export default DemoLoginButtons
