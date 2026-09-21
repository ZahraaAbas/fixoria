import { BrowserRouter, Routes, Route } from 'react-router'
import PublicLayout from './layouts/PublicLayout'
import Landing from './pages/Landing'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Register from './pages/Register'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<PublicLayout />}>
          <Route path="/home" element={<Home />} />
        </Route>
                <Route path="/login" element={<Login role="resident" />} />
        <Route path="/artisan/login" element={<Login role="artisan" />} />
        <Route path="/admin/login" element={<Login role="admin" />} />
            <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App