import { useState } from 'react'
import { Link } from 'react-router'
import { translate } from '../i18n'
import './Auth.css'

const fields = [
  { name: 'fullName', type: 'text', autoComplete: 'name' },
  { name: 'phone', type: 'tel', autoComplete: 'tel' },
  { name: 'building', type: 'text', autoComplete: 'off' },
  { name: 'apartment', type: 'text', autoComplete: 'off' },
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'password', type: 'password', autoComplete: 'new-password' },
]

const initialFormData = Object.fromEntries(
  fields.map((field) => [field.name, '']),
)

function Register() {
  const [formData, setFormData] = useState(initialFormData)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    // لاحقًا: إرسال formData إلى خدمة إنشاء الحساب
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Link to="/" className="auth-brand">
          {translate('common.brand')}
        </Link>

        <h1 className="auth-title">{translate('register.title')}</h1>

        {fields.map((field) => (
          <label key={field.name} className="auth-field">
            <span>{translate(`register.${field.name}`)}</span>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name]}
              onChange={handleChange}
              autoComplete={field.autoComplete}
            />
          </label>
        ))}

        <button type="submit" className="auth-submit">
          {translate('register.submit')}
        </button>

        <p className="auth-switch">
          {translate('register.haveAccount')}{' '}
          <Link to="/login">{translate('register.login')}</Link>
        </p>
      </form>
    </main>
  )
}

export default Register