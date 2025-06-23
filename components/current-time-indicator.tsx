"use client"

import React, { useRef, useCallback, useLayoutEffect } from "react"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { cn } from "@/lib/utils"

interface CurrentTimeIndicatorProps {
  timeSlots: string[]
  isMobile?: boolean
  className?: string
  agendaRef: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>
  clinicOpenTime?: string
  clinicCloseTime?: string
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  timeSlots,
  isMobile = false,
  className,
  agendaRef,
  clinicOpenTime,
  clinicCloseTime,
}) => {
  const indicatorRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ ESTRATEGIA INTELIGENTE: Usar granularidades DOM reales ya renderizadas
  const calculatePosition = useCallback((): { top: number; visible: boolean; timeText: string; withinView: boolean } | null => {
    if (!timeSlots.length || !agendaRef.current) {
      return null
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    
    // ✅ VERIFICAR HORARIO DE CLÍNICA
    if (clinicOpenTime && clinicCloseTime) {
      if (currentTimeString < clinicOpenTime || currentTimeString > clinicCloseTime) {
        return { top: 0, visible: false, timeText: currentTimeString, withinView: false }
      }
    }

    // ✅ NUEVA ESTRATEGIA: Buscar elementos DOM reales con data-time
    const container = agendaRef.current
    const hourElements = Array.from(container.querySelectorAll('[data-time]'))
    
    if (hourElements.length === 0) {
      console.warn('[TimeIndicator] No se encontraron elementos con data-time')
      return null
    }

    const currentTotalMinutes = currentHour * 60 + currentMinute
    
    // ✅ ENCONTRAR EL ELEMENTO DOM ANTERIOR/ACTUAL
    let targetElement: Element | null = null
    let targetMinutes = -1
    
    for (let i = hourElements.length - 1; i >= 0; i--) {
      const element = hourElements[i]
      const timeAttribute = element.getAttribute('data-time')
      if (!timeAttribute) continue
      
      const [elementHour, elementMinute] = timeAttribute.split(':').map(Number)
      const elementTotalMinutes = elementHour * 60 + elementMinute
      
      if (elementTotalMinutes <= currentTotalMinutes) {
        targetElement = element
        targetMinutes = elementTotalMinutes
        break
      }
    }

    if (!targetElement) {
      // Si no hay elemento anterior, usar el primero
      targetElement = hourElements[0]
      const firstTime = targetElement.getAttribute('data-time')!
      const [firstHour, firstMinute] = firstTime.split(':').map(Number)
      targetMinutes = firstHour * 60 + firstMinute
    }

    // ✅ USAR POSICIÓN REAL DEL DOM + INTERPOLACIÓN PRECISA
    const elementRect = (targetElement as HTMLElement).getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Posición base del elemento relativa al contenedor
    const baseTop = elementRect.top - containerRect.top + container.scrollTop
    
    // ✅ CALCULAR INTERPOLACIÓN HASTA LA SIGUIENTE GRANULARIDAD
    const offsetMinutes = currentTotalMinutes - targetMinutes
    
    // Buscar siguiente elemento para calcular spacing real
    const targetTime = targetElement.getAttribute('data-time')!
    const targetIndex = timeSlots.indexOf(targetTime)
    let spacingHeight = AGENDA_CONFIG.ROW_HEIGHT // Fallback
    
    if (targetIndex >= 0 && targetIndex < timeSlots.length - 1) {
      // Calcular spacing real entre esta granularidad y la siguiente
      const nextTime = timeSlots[targetIndex + 1]
      const [nextHour, nextMinute] = nextTime.split(':').map(Number)
      const nextTotalMinutes = nextHour * 60 + nextMinute
      const minuteSpacing = nextTotalMinutes - targetMinutes
      
      // Usar proporción real: offsetMinutes / minuteSpacing * altura
      const interpolationRatio = Math.min(offsetMinutes / minuteSpacing, 1)
      spacingHeight = elementRect.height // Usar altura real del elemento
      
      const finalTop = baseTop + (interpolationRatio * spacingHeight)
      
      // ✅ DEBUG LOG comentado para evitar spam
      // console.log('[TimeIndicator] 🎯 POSICIONAMIENTO DOM:', {
      //   currentTime: currentTimeString,
      //   targetTime,
      //   targetElement: targetElement.tagName + '.' + targetElement.className,
      //   baseTop,
      //   offsetMinutes,
      //   minuteSpacing,
      //   interpolationRatio,
      //   spacingHeight,
      //   finalTop
      // })
      
      // ✅ VERIFICAR SI ESTÁ DENTRO DEL VIEWPORT
      let withinView = true
      const scrollContainer = container.parentElement
      if (scrollContainer) {
        const scrollTop = scrollContainer.scrollTop
        const scrollBottom = scrollTop + scrollContainer.clientHeight
        const headerOffset = 100
        withinView = finalTop >= (scrollTop + headerOffset) && finalTop <= scrollBottom
      }

      return {
        top: Math.max(0, finalTop),
        visible: true,
        timeText: currentTimeString,
        withinView
      }
    }

    // Fallback si no hay siguiente elemento
    return {
      top: Math.max(0, baseTop),
      visible: true,
      timeText: currentTimeString,
      withinView: true
    }
  }, [timeSlots, agendaRef, clinicOpenTime, clinicCloseTime])



  // ✅ EFECTO PRINCIPAL - DEPENDENCIAS ESTABLES PARA EVITAR BUCLES INFINITOS
  useLayoutEffect(() => {
    if (!timeSlots.length) return

    // ✅ LIMPIAR TIMERS ANTERIORES
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      clearInterval(timeoutRef.current)
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // ✅ FUNCIÓN LOCAL PARA EVITAR DEPENDENCIAS INESTABLES
    const localUpdate = () => {
      if (!indicatorRef.current) return

      const position = calculatePosition()
      
      if (!position || !position.visible || !position.withinView) {
        indicatorRef.current.style.display = 'none'
        return
      }

      const indicator = indicatorRef.current
      indicator.style.display = 'block'
      indicator.style.top = `${position.top}px`
      
      const timeLabel = indicator.querySelector('.time-label')
      if (timeLabel) {
        timeLabel.textContent = position.timeText
      }
    }

    // ✅ FUNCIÓN LOCAL PARA INICIAR UPDATES
    const initializeUpdates = () => {
      const update = () => {
        localUpdate()
        
        // Programar siguiente actualización cada minuto exacto
        const now = new Date()
        const nextMinute = new Date(now)
        nextMinute.setMinutes(now.getMinutes() + 1, 0, 0)
        const msUntilNextMinute = nextMinute.getTime() - now.getTime()
        
        timeoutRef.current = setTimeout(() => {
          update()
          timeoutRef.current = setInterval(update, 60000)
        }, msUntilNextMinute)
      }

      update()
    }

    // ✅ INICIALIZAR DESPUÉS DEL RENDERIZADO
    animationRef.current = requestAnimationFrame(() => {
      setTimeout(initializeUpdates, 50)
    })

    // ✅ LISTENER DE SCROLL - FUNCIÓN LOCAL
    const scrollContainer = agendaRef.current?.parentElement
    let scrollListener: (() => void) | null = null
    
    if (scrollContainer) {
      scrollListener = () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
        animationRef.current = requestAnimationFrame(localUpdate)
      }
      
      scrollContainer.addEventListener('scroll', scrollListener, { passive: true })
    }

    // ✅ CLEANUP
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        clearInterval(timeoutRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (scrollListener && scrollContainer) {
        scrollContainer.removeEventListener('scroll', scrollListener)
      }
    }
  }, [timeSlots.length]) // ✅ SOLO timeSlots.length como dependencia estable

  return (
    <div
      ref={indicatorRef}
      className={cn(
        "absolute left-0 w-full pointer-events-none",
        "z-[30]", // Por debajo de cabeceras (z-40) pero por encima de citas (z-10)
        className
      )}
      style={{
        height: '2px',
        backgroundColor: '#dc2626', // red-600
        display: 'none',
      }}
      aria-hidden="true"
    >
      {/* ✅ ETIQUETA DE HORA COMPACTA */}
      <div 
        className="absolute -top-2 left-1 px-1.5 py-0.5 text-[10px] font-medium text-red-600 bg-white border border-red-300 rounded-sm"
        style={{ 
          zIndex: 32,
          fontSize: '10px',
          lineHeight: '12px'
        }}
      >
        <span className="time-label">00:00</span>
      </div>
    </div>
  )
} 