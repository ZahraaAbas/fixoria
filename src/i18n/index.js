import ar from './ar'
import en from './en'

const translations = { ar, en }

// دالة للحصول على اللغة الحالية (افتراضياً عربي)
export function getCurrentLanguage() {
  return localStorage.getItem('fixoria_lang') || 'ar'
}

// دالة لتغيير اللغة وحفظها وتحديث اتجاه الصفحة
export function setLanguage(lang) {
  if (lang === 'ar' || lang === 'en') {
    localStorage.setItem('fixoria_lang', lang)
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
    // إعادة تحميل الصفحة لتطبيق التغييرات بسلاسة على كل المكونات
    window.location.reload()
  }
}

// دالة الترجمة بناءً على اللغة الحالية
export function translate(key) {
  const currentLang = getCurrentLanguage()
  const langData = translations[currentLang] || ar
  
  const value = key.split('.').reduce((obj, part) => obj?.[part], langData)
  return typeof value === 'string' ? value : key
}