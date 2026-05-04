import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useSwipeBack() {
  const navigate = useNavigate()

  useEffect(() => {
    let startX = 0
    let startY = 0

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const deltaX = endX - startX
      const deltaY = Math.abs(endY - startY)

      // Swipe right from left edge (within 30px), with horizontal dominance
      if (startX < 30 && deltaX > 80 && deltaY < 50) {
        navigate(-1)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigate])
}
