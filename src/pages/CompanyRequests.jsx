import RequestsWorkspace from '../components/dashboard/RequestsWorkspace'
import { getCompanyRequests } from '../services/companyService'

// طلبات حرفيي الشركة + الطلبات المفتوحة بمجمعاتها: جدول بفلاتر وتفاصيل جانبية
function CompanyRequests() {
  return <RequestsWorkspace loader={getCompanyRequests} titleKey="company.requests.title" />
}

export default CompanyRequests
