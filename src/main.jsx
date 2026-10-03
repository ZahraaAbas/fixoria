import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { getCurrentLanguage } from './i18n'
import App from './App.jsx'

// تطبيق اتجاه الصفحة حسب اللغة المحفوظة (index.html يبدأ دائمًا بالعربية RTL)
const lang = getCurrentLanguage()
document.documentElement.setAttribute('lang', lang)
document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
