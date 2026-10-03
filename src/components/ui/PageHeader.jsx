import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'

// رابط رجوع موحّد (السهم يشير للخلف حسب اتجاه اللغة)
export function BackLink({ to, children }) {
  return (
    <Link to={to} className="fx-back">
      <ArrowRight size={16} aria-hidden="true" className="icon-forward" />
      {children}
    </Link>
  )
}

// رأس صفحة موحّد: عنوان صغير + عنوان + وصف + إجراءات
function PageHeader({ eyebrow, title, meta, actions, back }) {
  return (
    <Reveal className="fx-page-head">
      {back}
      <div className="fx-page-head-row">
        <div className="fx-page-head-text">
          {eyebrow && <span className="fx-eyebrow">{eyebrow}</span>}
          <h1 className="fx-h1">{title}</h1>
          {meta && <div className="fx-page-head-meta">{meta}</div>}
        </div>
        {actions && <div className="fx-page-head-actions">{actions}</div>}
      </div>
    </Reveal>
  )
}

export default PageHeader
