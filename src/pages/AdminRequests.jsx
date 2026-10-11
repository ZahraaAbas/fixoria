import RequestsWorkspace from '../components/dashboard/RequestsWorkspace'
import AssignArtisan from '../components/dashboard/AssignArtisan'
import { getRequestsOverview } from '../services/adminService'

// طلبات المجمع: نفس جدول الشركة، وبالتفاصيل المشرف يكدر يعيّن حرفي للطلب المعلق
function AdminRequests() {
  return (
    <RequestsWorkspace
      loader={getRequestsOverview}
      titleKey="adminRequests.title"
      drawerActions={(request, patch) => <AssignArtisan key={request.id} request={request} onAssigned={patch} />}
    />
  )
}

export default AdminRequests
