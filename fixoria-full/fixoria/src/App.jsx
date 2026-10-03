import { BrowserRouter, Routes, Route } from 'react-router'
import AuthProvider from './context/AuthProvider'
import PublicLayout from './layouts/PublicLayout'
import RequireAuth from './routes/RequireAuth'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Artisans from './pages/Artisans'
import ArtisanProfile from './pages/ArtisanProfile'
import ServiceArtisans from './pages/ServiceArtisans'
import RequestForm from './pages/RequestForm'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import MyRequests from './pages/MyRequests'
import AdminDashboardNew from './pages/AdminDashboardNew'
import ArtisanDashboardNew from './pages/ArtisanDashboardNew'
import ResidentDashboard from './pages/ResidentDashboard'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<PublicLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/artisans" element={<Artisans />} />
            <Route path="/artisans/:id" element={<ArtisanProfile />} />
            <Route path="/services/:serviceId" element={<ServiceArtisans />} />
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
          </Route>

          <Route path="/login" element={<Login role="resident" />} />
          <Route path="/artisan/login" element={<Login role="artisan" />} />
          <Route path="/admin/login" element={<Login role="admin" />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <RequireAuth role="resident">
                <ResidentDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth role="admin">
                <AdminDashboardNew />
              </RequireAuth>
            }
          />
          <Route
            path="/artisan/dashboard"
            element={
              <RequireAuth role="artisan">
                <ArtisanDashboardNew />
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App