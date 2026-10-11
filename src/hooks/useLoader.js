import { useCallback, useEffect, useState } from 'react'

// يجيب بيانات من loader مرة وحدة، مع حالة التحميل والخطأ وإعادة المحاولة
export function useLoader(loader) {
  const [state, setState] = useState({ data: null, error: null, isLoading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let isCancelled = false
    loader()
      .then((data) => {
        if (!isCancelled) setState({ data, error: null, isLoading: false })
      })
      .catch((error) => {
        if (!isCancelled) setState({ data: null, error, isLoading: false })
      })
    return () => {
      isCancelled = true
    }
  }, [loader, attempt])

  const retry = useCallback(() => {
    setState({ data: null, error: null, isLoading: true })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
