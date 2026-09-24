import { Mail, MapPin } from 'lucide-react'
import { translate } from '../i18n'
import './StaticPage.css'
import './Contact.css'

function Contact() {
  return (
    <section className="static-page">
      <h1>{translate('contact.title')}</h1>
      <p className="static-page-lead">{translate('contact.lead')}</p>

      <div className="contact-info">
        <a href="mailto:support@fixoria.app" className="contact-info-item">
          <Mail size={20} />
          <span>support@fixoria.app</span>
        </a>
        <div className="contact-info-item">
          <MapPin size={20} />
          <span>{translate('contact.location')}</span>
        </div>
      </div>
    </section>
  )
}

export default Contact