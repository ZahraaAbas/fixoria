import AdminRequests from './AdminRequests'
import { getCompanyRequests } from '../services/companyService'

// طلبات حرفيي الشركة + الطلبات المفتوحة بمجمعاتها، بنفس واجهة طلبات المشرف
function CompanyRequests() {
  return <AdminRequests loader={getCompanyRequests} titleKey="company.requests.title" />
}

export default CompanyRequests
