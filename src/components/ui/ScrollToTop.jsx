import { useEffect } from 'react'
import { useLocation } from 'react-router'

// يعيد التمرير لأعلى الصفحة عند الانتقال لصفحة جديدة (الروابط الداخلية #… لا تتأثر)
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

export default ScrollToTop
