import { create } from 'zustand'
import { useEffect } from 'react'

interface HoverInfo {
  cellId: string
  offsetY: number
  exactTime: string
  granularityType?: 'normal' | 'blue' | 'green'
}

interface GlobalHoverState {
  hoveredInfo: HoverInfo | null
  setHoveredInfo: (info: HoverInfo | null) => void
  clearHover: () => void
  lastScrollTime: number
  setLastScrollTime: (time: number) => void
}

export const useGlobalHoverState = create<GlobalHoverState>((set, get) => ({
  hoveredInfo: null,
  lastScrollTime: 0,
  setHoveredInfo: (info) => {
    // ✅ ANTI-SCROLL: No actualizar hover si hay scroll reciente
    const now = Date.now()
    const { lastScrollTime } = get()
    
    // Si hay scroll muy reciente (menos de 100ms), ignorar hover updates
    if (now - lastScrollTime < 100) {
      return
    }
    
    set({ hoveredInfo: info })
  },
  clearHover: () => set({ hoveredInfo: null }),
  setLastScrollTime: (time) => set({ lastScrollTime: time })
}))

// ✅ NUEVO: Hook para detectar scroll y limpiar hover automáticamente
export const useScrollHoverClearance = () => {
  const { clearHover, setLastScrollTime } = useGlobalHoverState()
  
  useEffect(() => {
    let isScrolling = false
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      const now = Date.now()
      setLastScrollTime(now)
      
      // Limpiar hover inmediatamente al detectar scroll
      if (!isScrolling) {
        clearHover()
        isScrolling = true
      }
      
      // Resetear flag después de que termine el scroll
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isScrolling = false
      }, 150)
    }
    
    // ✅ DETECTAR SCROLL EN MÚLTIPLES ELEMENTOS
    // Agenda containers que pueden hacer scroll
    const scrollContainers = [
      document.body,
      ...Array.from(document.querySelectorAll('[data-scroll-container]')),
      ...Array.from(document.querySelectorAll('.overflow-auto')),
      ...Array.from(document.querySelectorAll('.overflow-y-auto')),
    ]
    
    // Añadir listener a cada container
    scrollContainers.forEach(container => {
      container.addEventListener('scroll', handleScroll, { passive: true })
    })
    
    // También detectar scroll global de window
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      clearTimeout(scrollTimeout)
      scrollContainers.forEach(container => {
        container.removeEventListener('scroll', handleScroll)
      })
      window.removeEventListener('scroll', handleScroll)
    }
  }, [clearHover, setLastScrollTime])
}
