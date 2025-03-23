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
  onMenuToggle?: (isOpen?: boolean) => void // Callback para notificar apertura/cierre del menú con parámetro opcional
  isMobileView?: boolean // Indica si estamos en vista móvil
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
  autoCollapseTimeout = 5000, // 5 segundos por defecto
  onMenuToggle,
  isMobileView,
}: FloatingMenuBaseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Si no es visible, no renderizamos nada
  if (!isVisible) return null

  // Efecto para escuchar el evento 'close-menu'
  useEffect(() => {
    const handleCloseMenu = () => {
      setIsOpen(false);
      setIsExpanded(false);
    };

    if (menuRef.current) {
      menuRef.current.addEventListener('close-menu', handleCloseMenu);
      return () => {
        menuRef.current?.removeEventListener('close-menu', handleCloseMenu);
      };
    }
  }, []);

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
          onMenuToggle?.(false); // Notificar el cierre
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
  }, [isExpanded, autoCollapseTimeout, onMenuToggle]);

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
        top: `${4 + offsetY}px`,
        right: '2px'
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
                "w-12 h-12 rounded-full relative group shadow-lg",
                `bg-${color}-600 text-white hover:bg-${color}-700`
              )}
              style={{
                boxShadow: `0 4px 14px rgba(0, 0, 0, 0.15)`
              }}
              onClick={() => {
                setIsOpen(!isOpen)
                onMenuToggle?.(!isOpen)
              }}
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
                  onMenuToggle?.(false)
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </div>
            </Button>
          ) : (
            // Flecha de expansión cuando está plegado
            <div 
              className={cn(
                "w-8 h-12 -ml-2 flex items-center justify-center cursor-pointer shadow-md",
                "rounded-l-lg transition-colors",
                `bg-${color}-600 hover:bg-${color}-700 text-white`
              )}
              onClick={() => setIsExpanded(true)}
            >
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Contenido del menú - ajustado para aparecer a la izquierda del botón */}
        {isExpanded && isOpen && (
          <div 
            className={cn(
              "absolute overflow-hidden",
              color === "purple" ? "bg-white rounded-md border" : (isMobileView ? "bg-transparent rounded-b-lg" : "bg-transparent")
            )}
            style={{
              right: isMobileView ? 0 : (color === "blue" ? "35px" : "60px"), // En móvil, posición justo debajo
              top: isMobileView ? "100%" : (color === "blue" ? "10px" : "0px"), // Menú de personal más hacia abajo
              width: isMobileView ? "100%" : "auto",
              transform: "translateY(0)",
              boxShadow: color === "purple" ? "0 8px 30px rgba(0, 0, 0, 0.16)" : (isMobileView ? "0 8px 16px rgba(0, 0, 0, 0.1)" : "none"),
              zIndex: 999999,
              minWidth: isMobileView ? "100%" : (color === "purple" ? "200px" : "85px"), // Anchura completa en móvil
              maxWidth: isMobileView ? "100%" : (color === "purple" ? "220px" : "85px"),
              maxHeight: "calc(100vh - 20px)"
            }}
          >
            <style jsx global>{`
              @keyframes floatingMenuAppear {
                0% { 
                  opacity: 0; 
                  transform: translateX(10px) scale(0.96);
                }
                100% { 
                  opacity: 1; 
                  transform: translateX(0) scale(1);
                }
              }
              
              /* Animación más suave y elegante */
              .menu-content-appear {
                animation: floatingMenuAppear 0.25s cubic-bezier(0.15, 1.15, 0.6, 1.0) forwards;
              }
              
              /* Animación vertical para móvil */
              @keyframes mobileMenuAppear {
                0% { 
                  opacity: 0; 
                  transform: translateY(-10px);
                }
                100% { 
                  opacity: 1; 
                  transform: translateY(0);
                }
              }
              
              .mobile-menu-appear {
                animation: mobileMenuAppear 0.25s cubic-bezier(0.15, 1.15, 0.6, 1.0) forwards;
              }
            `}</style>
            
            {/* Indicador triangular que apunta hacia la derecha - solo para el menú de clientes y versión de escritorio */}
            {color === "purple" && !isMobileView && (
              <div className="absolute top-6 -right-[6px] z-10">
                <div 
                  className="w-3 h-3 rotate-45 bg-white border-r border-t"
                  style={{
                    boxShadow: "2px -1px 2px rgba(0, 0, 0, 0.03)"
                  }}
                ></div>
              </div>
            )}
            
            <div className={isMobileView ? "mobile-menu-appear" : "menu-content-appear"}>
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 