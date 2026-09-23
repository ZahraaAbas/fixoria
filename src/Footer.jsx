import { translate } from '../i18n'
import './Footer.css'

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-logo">🛠️ {translate('common.brand')}</span>
          <p className="footer-desc">
            منصة مجمع البدور السكني لربط السكان بأفضل الحرفيين ومزودي الخدمات المحليين بكل ثقة وسرعة.
          </p>
        </div>
        <div className="footer-info">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Fixoria. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer