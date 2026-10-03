import { ArrowLeft, Mail, MapPin } from 'lucide-react'
import { translate } from '../i18n'
import PageHeader from '../components/ui/PageHeader'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import './StaticPage.css'
import './Contact.css'

function Contact() {
  return (
    <section className="static-page">
      <PageHeader title={translate('contact.title')} />
      <Reveal as="p" className="fx-lead static-page-lead">
        {translate('contact.lead')}
      </Reveal>

      <RevealGroup className="contact-grid" gap={0.1}>
        <RevealItem>
          <a href="mailto:support@fixoria.app" className="contact-card fx-card contact-card--link">
            <span className="contact-card-icon" aria-hidden="true">
              <Mail size={22} />
            </span>
            <span className="contact-card-value" dir="ltr">
              support@fixoria.app
            </span>
            <ArrowLeft size={18} aria-hidden="true" className="contact-card-arrow icon-forward" />
          </a>
        </RevealItem>
        <RevealItem>
          <div className="contact-card fx-card">
            <span className="contact-card-icon contact-card-icon--navy" aria-hidden="true">
              <MapPin size={22} />
            </span>
            <span className="contact-card-value">{translate('contact.location')}</span>
          </div>
        </RevealItem>
      </RevealGroup>
    </section>
  )
}

export default Contact
