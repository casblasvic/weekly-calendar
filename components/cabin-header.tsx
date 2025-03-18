"use client"

import { useEffect, useRef } from "react"
import { expandHexColor } from "@/utils/color-utils"

interface Cabin {
  id: string | number
  code: string
  color: string
  isActive: boolean
  order: number
  name?: string
}

interface CabinHeaderProps {
  cabin: Cabin
}

export function CabinHeader({ cabin }: CabinHeaderProps) {
  const headerRef = useRef<HTMLTableCellElement>(null)

  // Aplicar el color directamente al DOM después del renderizado
  useEffect(() => {
    if (headerRef.current) {
      const expandedColor = expandHexColor(cabin.color)
      headerRef.current.style.backgroundColor = expandedColor
      headerRef.current.style.color = "white"
    }
  }, [cabin.color])

  return (
    <th
      ref={headerRef}
      data-cabin-id={cabin.id}
      className="text-xs p-2 text-center font-medium border-r last:border-r-0"
      suppressHydrationWarning
    >
      {cabin.code}
    </th>
  )
}

