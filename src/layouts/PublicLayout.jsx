
import { Outlet, Link, NavLink } from 'react-router';
import { Search, Settings, Info, PhoneCall, Home, Wrench, FileText } from 'lucide-react';
import './PublicLayout.css';

export default function PublicLayout() {
  return (
    <div className="public-layout">
      {/* شريط التنقل العلوي الاحترافي */}
      <header className="public-header">
        {/* الشعار أو اسم المشروع */}
        <Link to="/" className="public-brand">
          Fixoria
        </Link>

        {/* شريط البحث (Search Bar) */}
        <div className="public-search-container">
          <Search size={18} className="public-search-icon" />
          <input 
            type="text" 
            placeholder="ابحث عن خدمة، حرفي..." 
            className="public-search-input"
          />
        </div>

        {/* روابط التنقل الرئيسية */}
        <nav className="public-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            <Home size={16} className="inline-block ml-1" /> الرئيسية
          </NavLink>
          <NavLink to="/artisans" className={({ isActive }) => isActive ? 'active' : ''}>
            <Wrench size={16} className="inline-block ml-1" /> الحرفيون
          </NavLink>
          <NavLink to="/requests" className={({ isActive }) => isActive ? 'active' : ''}>
            <FileText size={16} className="inline-block ml-1" /> طلباتي
          </NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'active' : ''}>
            <Info size={16} className="inline-block ml-1" /> من نحن
          </NavLink>
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>
            <PhoneCall size={16} className="inline-block ml-1" /> اتصل بنا
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
            <Settings size={16} className="inline-block ml-1" /> الإعدادات
          </NavLink>
        </nav>

        {/* أزرار الحساب وتسجيل الخروج */}
        <div className="public-user-section">
          <span className="public-user">مرحباً بك</span>
          <button className="public-logout">تسجيل الخروج</button>
        </div>
      </header>

      {/* محتوى الصفحات */}
      <main className="public-content">
        <Outlet />
      </main>
    </div>
  );
}