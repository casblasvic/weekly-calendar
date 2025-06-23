"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface TimeHoverIndicatorProps {
  time: string
  offsetY: number
  isDaily?: boolean
  cellHeight?: number
}

/**
 * Indicador visual de la hora exacta al hacer hover.
 * Se auto-ajusta según el tamaño de la celda y la vista (semanal/diaria).
 */
const TimeHoverIndicator: React.FC<TimeHoverIndicatorProps> = ({
  time,
  offsetY,
  isDaily = false,
  cellHeight = 48
}) => {
  // En la vista diaria, la línea es más gruesa y visible
  const lineThickness = isDaily ? 2 : 1
  
  // El indicador de tiempo se ajusta - más pequeño en vista diaria
  const fontSize = isDaily ? 'text-xs' : 'text-xs'
  const padding = isDaily ? 'px-1.5 py-0.5' : 'px-1.5 py-0.5'
  
  return (
    <>
      {/* Línea horizontal - z-50 para estar sobre cabeceras */}
      <div
        className={cn(
          "absolute left-0 right-0 pointer-events-none z-50",
          isDaily ? "bg-blue-500" : "bg-blue-400"
        )}
        style={{
          top: `${offsetY}px`,
          height: `${lineThickness}px`,
          opacity: isDaily ? 0.8 : 0.7
        }}
      />
      
      {/* Indicador de hora - z-50 para estar sobre cabeceras */}
      <div
        className={cn(
          "absolute left-0 pointer-events-none z-50",
          fontSize,
          padding,
          "bg-blue-500 text-white rounded-r-md shadow-sm",
          "transform -translate-y-1/2",
          "font-medium"
        )}
        style={{
          top: `${offsetY}px`,
          // Tamaño más compacto para ambas vistas
          minWidth: isDaily ? '45px' : '45px',
          fontSize: isDaily ? '11px' : '10px'
        }}
      >
        {time}
      </div>
    </>
  )
}

export default TimeHoverIndicator
