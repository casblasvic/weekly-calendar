'use client'

import React from 'react'

interface TimeHoverIndicatorProps {
  offsetY: number
  exactTime: string
  isVisible: boolean
}

export function TimeHoverIndicator({ offsetY, exactTime, isVisible }: TimeHoverIndicatorProps) {
  if (!isVisible) return null

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top: `${offsetY}px` }}
    >
      <div className="relative">
        <div className="absolute left-0 right-0 h-[1px] bg-blue-500"></div>
        <div className="absolute left-2 -top-3 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
          {exactTime}
        </div>
      </div>
    </div>
  )
}
