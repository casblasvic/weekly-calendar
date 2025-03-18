"use client"

import type React from "react"

interface AppointmentProps {
  top: number
  left: number
  width: number
  height: number
  isSelected: boolean
  onClick: () => void
  children: React.ReactNode
}

const Appointment: React.FC<AppointmentProps> = ({ top, left, width, height, isSelected, onClick, children }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent click from propagating to the parent (WeeklyAgenda)
    onClick()
  }

  return (
    <div
      className={`absolute rounded-md p-1 overflow-hidden border border-purple-400 bg-purple-200 text-purple-900 ${
        isSelected ? "ring-2 ring-purple-600 z-10" : ""
      }`}
      style={{
        top: `${top}px`,
        left: `${left}%`,
        width: `${width}%`,
        height: `${height}px`,
      }}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

export default Appointment

