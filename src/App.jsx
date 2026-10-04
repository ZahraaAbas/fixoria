import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
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
import Landing from './pages/Landing'

// كل الصفحات (عدا البوابة) تُحمَّل عند الحاجة فقط، فلا يحمّل الساكن مثلًا كود لوحة المشرف ورسومها البيانية
const Home = lazy(() => import('./pages/Home'))
const Artisans = lazy(() => import('./pages/Artisans'))
const ArtisanProfile = lazy(() => import('./pages/ArtisanProfile'))
const RequestForm = lazy(() => import('./pages/RequestForm'))
const MyRequests = lazy(() => import('./pages/MyRequests'))
const RequestDetail = lazy(() => import('./pages/RequestDetail'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ArtisanRegister = lazy(() => import('./pages/ArtisanRegister'))
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
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const ArtisanDashboard = lazy(() => import('./pages/ArtisanDashboard'))

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AmbientBackground />
        <ConnectionBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<PublicLayout />}>
              <Route
                path="/home"
                element={
                  <GuestOrResidentOnly>
                    <Home />
                  </GuestOrResidentOnly>
                }
              />
              <Route
                path="/artisans"
                element={
                  <GuestOrResidentOnly>
                    <Artisans />
                  </GuestOrResidentOnly>
                }
              />
              <Route
                path="/artisans/:id"
                element={
                  <GuestOrResidentOnly>
                    <ArtisanProfile />
                  </GuestOrResidentOnly>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route
                path="/requests/new/:categoryId"
                element={
                  <RequireAuth role="resident">
                    <RequestForm />
                  </RequireAuth>
                }
              />
              <Route
                path="/my-requests"
                element={
                  <RequireAuth role="resident">
                    <MyRequests />
                  </RequireAuth>
                }
              />
              <Route
                path="/my-requests/:id"
                element={
                  <RequireAuth role="resident">
                    <RequestDetail />
                  </RequireAuth>
                }
              />
            </Route>

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
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
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
            <Route path="/artisan/register" element={<ArtisanRegister />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App