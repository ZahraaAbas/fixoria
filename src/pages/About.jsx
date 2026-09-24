import { translate } from '../i18n'
import './StaticPage.css'

function About() {
  return (
    <section className="static-page">
      <h1>{translate('about.title')}</h1>
      <p className="static-page-lead">{translate('about.lead')}</p>

      <div className="static-page-block">
        <h2>{translate('about.missionTitle')}</h2>
        <p>{translate('about.missionText')}</p>
      </div>

      <div className="static-page-block">
        <h2>{translate('about.howTitle')}</h2>
        <ol className="static-page-steps">
          <li>{translate('about.step1')}</li>
          <li>{translate('about.step2')}</li>
          <li>{translate('about.step3')}</li>
        </ol>
      </div>
    </section>
  )
}

export default About