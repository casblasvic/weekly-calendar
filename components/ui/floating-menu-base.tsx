"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface FloatingMenuBaseProps {
  className?: string
  onOutsideClick?: () => void
  icon: React.ReactNode
  color?: string
  isVisible?: boolean
  label?: string
  children?: React.ReactNode
  offsetY?: number // Nueva prop para posicionamiento vertical
  autoCollapseTimeout?: number // Tiempo en ms para colapsar automáticamente
}

export function FloatingMenuBase({ 
  className,
  onOutsideClick,
  icon,
  color = "purple",
  isVisible = true,
  label,
  children,
  offsetY = 0,
  autoCollapseTimeout = 5000 // 5 segundos por defecto
}: FloatingMenuBaseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Si no es visible, no renderizamos nada
  if (!isVisible) return null

  // Efecto para colapsar automáticamente después de un tiempo de inactividad
  useEffect(() => {
    // Función para iniciar el temporizador de auto-colapso
    const startAutoCollapseTimer = () => {
      // Limpiar cualquier temporizador existente
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
      }
      
      // Solo establecer el temporizador si está expandido
      if (isExpanded) {
        autoCollapseTimerRef.current = setTimeout(() => {
          setIsExpanded(false);
          setIsOpen(false);
        }, autoCollapseTimeout);
      }
    };

    // Iniciar el temporizador cuando el componente se monta o cuando cambia isExpanded
    startAutoCollapseTimer();

    // Función para reiniciar el temporizador cuando el usuario interactúa
    const resetTimer = () => {
      if (isExpanded) {
        startAutoCollapseTimer();
      }
    };

    // Agregar event listeners para reiniciar el temporizador en interacciones
    if (menuRef.current) {
      menuRef.current.addEventListener('mouseenter', resetTimer);
      menuRef.current.addEventListener('mousemove', resetTimer);
      menuRef.current.addEventListener('click', resetTimer);
    }

    // Limpieza
    return () => {
      if (autoCollapseTimerRef.current) {
        clearTimeout(autoCollapseTimerRef.current);
      }
      if (menuRef.current) {
        menuRef.current.removeEventListener('mouseenter', resetTimer);
        menuRef.current.removeEventListener('mousemove', resetTimer);
        menuRef.current.removeEventListener('click', resetTimer);
      }
    };
  }, [isExpanded, autoCollapseTimeout]);

  // Cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        onOutsideClick?.()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onOutsideClick])

  // Determinar la clase específica según el color del menú
  const menuSpecificClass = color === "purple" 
    ? "floating-client-menu" 
    : color === "blue" 
      ? "floating-staff-menu" 
      : "";

  return (
    <div 
      ref={menuRef}
      className={cn(
        "fixed right-0 z-[9999] transition-all duration-300 ease-in-out",
        menuSpecificClass,
        className
      )}
      style={{
        top: `${12 + offsetY}px`
      }}
    >
      <div className="relative flex items-center">
        {/* Botón circular o flecha de expansión */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out flex items-center",
            isExpanded ? "translate-x-0" : "translate-x-[calc(100%-12px)]"
          )}
        >
          {isExpanded ? (
            // Botón circular cuando está expandido
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "w-12 h-12 rounded-full relative group",
                `bg-${color}-600 text-white hover:bg-${color}-700`
              )}
              onClick={() => setIsOpen(!isOpen)}
              title={label}
            >
              {icon}
              {/* Flecha de plegado */}
              <div 
                className={cn(
                  "absolute -right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full",
                  "bg-white shadow-sm flex items-center justify-center cursor-pointer",
                  `text-${color}-600 hover:bg-gray-100`
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(false)
                  setIsOpen(false)
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </div>
            </Button>
          ) : (
            // Flecha de expansión cuando está plegado
            <div 
              className={cn(
                "w-8 h-12 -ml-2 flex items-center justify-center cursor-pointer",
                "rounded-l-lg transition-colors",
                `bg-${color}-600 hover:bg-${color}-700 text-white`
              )}
              onClick={() => setIsExpanded(true)}
            >
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Contenido del menú */}
        {isExpanded && isOpen && (
          <div 
            className={cn(
              "absolute right-0 top-14",
              "animate-in fade-in-0 slide-in-from-right-1/4 duration-200"
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  )
} 