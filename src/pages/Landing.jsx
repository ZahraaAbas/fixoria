import { Link } from 'react-router'
import { motion } from 'motion/react'
import { translate } from '../i18n'
import { Globe, ArrowRight, Shield, Wrench, UserCheck, Eye } from 'lucide-react'
import './Landing.css'

function Landing() {
  const toggleLanguage = () => {
    const currentLang = localStorage.getItem('fixoria_lang') || 'ar'
    const newLang = currentLang === 'ar' ? 'en' : 'ar'
    localStorage.setItem('fixoria_lang', newLang)
    window.location.reload()
  }

  return (
    <main className="landing-container">
      {/* شريط علوي يضم الشعار وزر اللغة */}
      <header className="landing-header">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="landing-brand-wrapper"
        >
          <span className="landing-brand-icon">🔧</span>
          <span className="landing-brand">{translate('common.brand')}</span>
        </motion.div>

        <motion.button 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={toggleLanguage}
          className="lang-toggle-btn"
          title="تبديل اللغة / Change Language"
        >
          <Globe size={18} />
          <span>{localStorage.getItem('fixoria_lang') === 'en' ? 'العربية' : 'English'}</span>
        </motion.button>
      </header>

      {/* القسم الرئيسي */}
      <div className="landing-hero">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="landing-hero-content"
        >
          <span className="landing-badge">مجمع البدور السكني</span>
          <h1 className="landing-title">{translate('landing.title')}</h1>
          <p className="landing-description">{translate('landing.description')}</p>
        </motion.div>

        {/* أزرار الأدوار بتصميم بطاقات زجاجية تفاعلية ومضغوطة */}
        <motion.nav 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="landing-actions"
        >
          <Link to="/login" className="landing-card-action">
            <div className="card-icon-bg"><UserCheck size={20} /></div>
            <div className="card-texts">
              <h3>{translate('landing.residentLogin')}</h3>
            </div>
            <ArrowRight className="arrow-icon" size={16} />
          </Link>

          <Link to="/artisan/login" className="landing-card-action">
            <div className="card-icon-bg"><Wrench size={20} /></div>
            <div className="card-texts">
              <h3>{translate('landing.artisanLogin')}</h3>
            </div>
            <ArrowRight className="arrow-icon" size={16} />
          </Link>

          <Link to="/home" className="landing-card-action landing-guest-card">
            <div className="card-icon-bg"><Eye size={20} /></div>
            <div className="card-texts">
              <h3>{translate('landing.guest')}</h3>
            </div>
            <ArrowRight className="arrow-icon" size={16} />
          </Link>

          <Link to="/admin/login" className="landing-card-action landing-admin-card">
            <div className="card-icon-bg"><Shield size={20} /></div>
            <div className="card-texts">
              <h3>{translate('landing.adminLogin')}</h3>
            </div>
            <ArrowRight className="arrow-icon" size={16} />
          </Link>
        </motion.nav>
      </div>
    </main>
  )
}

export default Landing