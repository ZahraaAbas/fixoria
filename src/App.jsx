import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router'
import AuthProvider from './context/AuthProvider'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import ArtisanLayout from './layouts/ArtisanLayout'
import RequireAuth from './routes/RequireAuth'
import GuestOrResidentOnly from './routes/GuestOrResidentOnly'
import AmbientBackground from './components/ui/AmbientBackground'
import PageLoader from './components/ui/PageLoader'
import ScrollToTop from './components/ui/ScrollToTop'
import ConnectionBanner from './components/ui/ConnectionBanner'

// كل الصفحات تُحمَّل عند الحاجة فقط، فلا يحمّل الساكن مثلًا كود لوحة المشرف ورسومها البيانية
const Home = lazy(() => import('./pages/Home'))
const ArtisanProfile = lazy(() => import('./pages/ArtisanProfile'))
const RequestForm = lazy(() => import('./pages/RequestForm'))
const MyRequests = lazy(() => import('./pages/MyRequests'))
const RequestDetail = lazy(() => import('./pages/RequestDetail'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ArtisanPending = lazy(() => import('./pages/ArtisanPending'))
const ArtisanRequests = lazy(() => import('./pages/ArtisanRequests'))
const ArtisanMyWork = lazy(() => import('./pages/ArtisanMyWork'))
const AdminArtisans = lazy(() => import('./pages/AdminArtisans'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ArtisanSettings = lazy(() => import('./pages/ArtisanSettings'))
const ArtisanReviews = lazy(() => import('./pages/ArtisanReviews'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminRequests = lazy(() => import('./pages/AdminRequests'))
const AdminCategories = lazy(() => import('./pages/AdminCategories'))
const AdminReviews = lazy(() => import('./pages/AdminReviews'))
const AdminAccount = lazy(() => import('./pages/AdminAccount'))
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'))
const OwnerCompounds = lazy(() => import('./pages/OwnerCompounds'))
const OwnerCompanies = lazy(() => import('./pages/OwnerCompanies'))
const OwnerAgreements = lazy(() => import('./pages/OwnerAgreements'))
const AdminResidents = lazy(() => import('./pages/AdminResidents'))
const ResidentPending = lazy(() => import('./pages/ResidentPending'))
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'))
const CompanyArtisans = lazy(() => import('./pages/CompanyArtisans'))
const CompanyRequests = lazy(() => import('./pages/CompanyRequests'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const ArtisanDashboard = lazy(() => import('./pages/ArtisanDashboard'))
const ResidentSettings = lazy(() => import('./pages/ResidentSettings'))

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AmbientBackground />
        <ConnectionBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* الموقع يفتح كزائر على الرئيسية مباشرة؛ خيارات الدخول تطلع من زر "تسجيل الدخول" */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route element={<PublicLayout />}>
              <Route
                path="/home"
                element={
                  <GuestOrResidentOnly>
                    <Home />
                  </GuestOrResidentOnly>
                }
              />
              {/* قائمة الحرفيين انشالت: الساكن يشوف حرفيي مجمعه بالرئيسية */}
              <Route path="/artisans" element={<Navigate to="/home" replace />} />
              <Route
                path="/artisans/:id"
                element={
                  <RequireAuth role="resident" requireApproved>
                    <ArtisanProfile />
                  </RequireAuth>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/requests/new/:categoryId"
                element={
                  <RequireAuth role="resident" requireApproved>
                    <RequestForm />
                  </RequireAuth>
                }
              />
              <Route
                path="/my-requests"
                element={
                  <RequireAuth role="resident" requireApproved>
                    <MyRequests />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth role="resident">
                    <ResidentSettings />
                  </RequireAuth>
                }
              />
              <Route
                path="/my-requests/:id"
                element={
                  <RequireAuth role="resident" requireApproved>
                    <RequestDetail />
                  </RequireAuth>
                }
              />
            </Route>

            <Route
              path="/resident/pending"
              element={
                <RequireAuth role="resident">
                  <ResidentPending />
                </RequireAuth>
              }
            />

            <Route
              path="/artisan/pending"
              element={
                <RequireAuth role="artisan">
                  <ArtisanPending />
                </RequireAuth>
              }
            />

            <Route
              element={
                <RequireAuth role="admin">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/admin/artisans" element={<AdminArtisans />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/requests" element={<AdminRequests />} />
              <Route path="/admin/residents" element={<AdminResidents />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/account" element={<AdminAccount />} />
            </Route>

            {/* مالك المنصة: نفس إطار لوحة المشرف بقائمة مختلفة */}
            <Route
              element={
                <RequireAuth role="owner">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/owner/dashboard" element={<OwnerDashboard />} />
              <Route path="/owner/compounds" element={<OwnerCompounds />} />
              <Route path="/owner/companies" element={<OwnerCompanies />} />
              <Route path="/owner/agreements" element={<OwnerAgreements />} />
              <Route path="/owner/categories" element={<AdminCategories />} />
              <Route path="/owner/account" element={<AdminAccount />} />
            </Route>

            {/* مدير شركة الصيانة: نفس الإطار بقائمة الشركة */}
            <Route
              element={
                <RequireAuth role="company_manager">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route path="/company/dashboard" element={<CompanyDashboard />} />
              <Route path="/company/artisans" element={<CompanyArtisans />} />
              <Route path="/company/requests" element={<CompanyRequests />} />
              <Route path="/company/account" element={<AdminAccount />} />
            </Route>

            <Route
              element={
                <RequireAuth role="artisan" requireApproved>
                  <ArtisanLayout />
                </RequireAuth>
              }
            >
              <Route path="/artisan/dashboard" element={<ArtisanDashboard />} />
              <Route path="/artisan/reviews" element={<ArtisanReviews />} />
              <Route path="/artisan/profile" element={<ArtisanSettings />} />
              <Route path="/artisan/requests" element={<ArtisanRequests />} />
              <Route path="/artisan/my-work" element={<ArtisanMyWork />} />
            </Route>

            <Route path="/login" element={<Login role="resident" />} />
            <Route path="/artisan/login" element={<Login role="artisan" />} />
            <Route path="/admin/login" element={<Login role="admin" />} />
            <Route path="/register" element={<Register />} />
            <Route path="/company/login" element={<Login role="company" />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App