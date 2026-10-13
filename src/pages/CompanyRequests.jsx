import RequestsWorkspace from '../components/dashboard/RequestsWorkspace'
import AssignArtisan from '../components/dashboard/AssignArtisan'
import { assignCompanyRequest, getCompanyArtisans, getCompanyRequests } from '../services/companyService'

// مدير الشركة يعيّن من حرفيي شركته بس (الخادم يرفض غيرهم)
const COMPANY = {
  loader: getCompanyArtisans,
  assign: assignCompanyRequest,
  eligible: (a, request) => a.isActive && (a.categoryIds || []).includes(request.serviceId),
}

// طلبات حرفيي الشركة + الطلبات المفتوحة بمجمعاتها، وبالتفاصيل المدير يعيّن حرفي للطلب المعلق
function CompanyRequests() {
  return (
    <RequestsWorkspace
      loader={getCompanyRequests}
      titleKey="company.requests.title"
      drawerActions={(request, patch) => (
        <AssignArtisan key={request.id} request={request} onAssigned={patch} source={COMPANY} />
      )}
    />
  )
}

export default CompanyRequests
