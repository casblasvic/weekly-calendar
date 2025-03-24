"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/contexts/clinic-context'

interface MobileClinicButtonProps {
  onClick: () => void
  isOpen: boolean
}

// Función para obtener las iniciales de la clínica
function getClinicInitials(clinicName: string): string {
  if (!clinicName) return "CL"
  
  const words = clinicName.split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  
  return words
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
}

export function MobileClinicButton({ onClick, isOpen }: MobileClinicButtonProps) {
  const { activeClinic } = useClinic()
  const [visible, setVisible] = useState(false)
  
  // Solo mostrar el botón en pantallas móviles
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobile = window.innerWidth < 768
      console.log("MobileClinicButton - Detectado móvil:", isMobile)
      setVisible(isMobile)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])
  
  // Efecto para depuración
  useEffect(() => {
    console.log("MobileClinicButton - visible:", visible, "isOpen:", isOpen)
  }, [visible, isOpen])
  
  if (!visible) return null
  
  const clinicInitials = getClinicInitials(activeClinic?.name || "CL")
  console.log("MobileClinicButton - Iniciales de clínica:", clinicInitials)
  
  return (
    <Button
      onClick={(e) => {
        console.log("Botón de clínica clickeado")
        onClick()
      }}
      className={cn(
        "fixed bottom-6 left-4 z-40 rounded-full w-10 h-10 p-0 shadow-lg flex items-center justify-center transition-all duration-300 MobileClinicButton",
        isOpen ? "bg-white text-purple-600 border border-purple-300" : "bg-purple-600/90 text-white"
      )}
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)' as any,
        backfaceVisibility: 'hidden' as any
      }}
    >
      {isOpen ? (
        <X size={16} />
      ) : (
        <Menu size={16} />
      )}
    </Button>
  )
} 