import { ListChecks, MessageSquareHeart, Send, Target } from 'lucide-react'
import { translate } from '../i18n'
import PageHeader from '../components/ui/PageHeader'
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal'
import './StaticPage.css'

const STEPS = [
  { key: 'about.step1', Icon: ListChecks },
  { key: 'about.step2', Icon: Send },
  { key: 'about.step3', Icon: MessageSquareHeart },
]

function About() {
  return (
    <section className="static-page">
      <PageHeader eyebrow={translate('footer.compound')} title={translate('about.title')} />
      <Reveal as="p" className="fx-lead static-page-lead">
        {translate('about.lead')}
      </Reveal>

      <Reveal as="div" className="static-mission fx-surface-depth" delay={0.05}>
        <span className="static-mission-icon" aria-hidden="true">
          <Target size={24} />
        </span>
        <div>
          <h2 className="static-mission-title">{translate('about.missionTitle')}</h2>
          <p className="static-mission-text">{translate('about.missionText')}</p>
        </div>
      </Reveal>

      <div className="static-block">
        <h2 className="fx-h2">{translate('about.howTitle')}</h2>
        <RevealGroup as="ol" className="static-steps" gap={0.1}>
          {STEPS.map(({ key, Icon }, index) => (
            <RevealItem as="li" key={key} className="static-step fx-card">
              <span className="static-step-number" aria-hidden="true">
                0{index + 1}
              </span>
              <span className="static-step-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <p>{translate(key)}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

export default About
