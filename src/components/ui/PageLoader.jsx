import { translate } from '../../i18n'

// يظهر لحظيًا أثناء تحميل صفحة لأول مرة (lazy loading).
function PageLoader() {
  return (
    <div className="fx-page-loader" role="status" aria-live="polite">
      <span className="fx-page-loader__mark" aria-hidden="true" />
      <span className="sr-only">{translate('common.loading')}</span>
    </div>
  )
}

export default PageLoader
