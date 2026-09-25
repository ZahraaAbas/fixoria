import { BrowserRouter, Routes, Route } from 'react-router'
import AuthProvider from './context/AuthProvider'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import ArtisanLayout from './layouts/ArtisanLayout'
import RequireAuth from './routes/RequireAuth'
import GuestOrResidentOnly from './routes/GuestOrResidentOnly'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Artisans from './pages/Artisans'
import ArtisanProfile from './pages/ArtisanProfile'
import RequestForm from './pages/RequestForm'
import MyRequests from './pages/MyRequests'
import RequestDetail from './pages/RequestDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ArtisanRegister from './pages/ArtisanRegister'
import ArtisanPending from './pages/ArtisanPending'
import ArtisanRequests from './pages/ArtisanRequests'
import ArtisanMyWork from './pages/ArtisanMyWork'
import AdminArtisans from './pages/AdminArtisans'
import NotFound from './pages/NotFound'
import ArtisanSettings from './pages/ArtisanSettings'
import ArtisanReviews from './pages/ArtisanReviews'
import AdminDashboard from './pages/AdminDashboard'
import AdminRequests from './pages/AdminRequests'
import AdminCategories from './pages/AdminCategories'
import AdminReviews from './pages/AdminReviews'
import About from './pages/About'
import Contact from './pages/Contact'
import ArtisanDashboard from './pages/ArtisanDashboard'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App