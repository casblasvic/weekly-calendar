"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { type MenuItem } from "@/config/menu-structure"

interface MenuItemProps {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
  isMobile?: boolean
}

export function MenuItemComponent({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
  isMobile = false,
}: MenuItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isActive = pathname === item.href
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasSubmenu) {
      toggleMenu(item.id)
    } else if (item.href) {
      router.push(item.href)
      toggleMenu("") // Close all menus when navigating
    }
  }

  // Función para posicionar el submenú 
  const positionSubmenu = () => {
    if (!submenuRef.current || !menuRef.current) return
    
    const menuRect = menuRef.current.getBoundingClientRect()
    const submenu = submenuRef.current
    
    // Para dispositivos móviles, mostrar en formato vertical
    if (isMobile) {
      // En dispositivos móviles, mostramos los submenús debajo del elemento padre
      submenu.style.position = "relative"
      submenu.style.left = "0"
      submenu.style.top = "0"
      submenu.style.width = "100%"
      submenu.style.maxHeight = "300px" // Altura máxima para submenús en móvil
      submenu.style.overflowY = "auto"
      return
    }
    
    // Para dispositivos de escritorio, seguimos con el posicionamiento avanzado
    submenu.style.position = "fixed"
    
    // Horizontal: Siempre a la derecha 
    const rightPosition = menuRect.right + 5
    submenu.style.left = `${rightPosition}px`
    
    // Si se sale por la derecha de la pantalla, colocarlo a la izquierda
    const viewportWidth = window.innerWidth
    const submenuWidth = submenu.offsetWidth
    if (rightPosition + submenuWidth > viewportWidth) {
      submenu.style.left = `${menuRect.left - submenuWidth - 5}px`
    }
    
    // Determinar altura del submenú y espacio disponible
    const submenuHeight = submenu.scrollHeight // Usar scrollHeight para obtener altura total
    const availableSpaceBelow = window.innerHeight - menuRect.top
    const availableSpaceAbove = menuRect.top
    
    // Decidir si mostrar arriba o abajo
    if (submenuHeight > availableSpaceBelow && availableSpaceAbove > availableSpaceBelow) {
      // Si hay más espacio arriba que abajo, mostrar arriba
      let topPosition = menuRect.top - submenuHeight
      
      // Ajustar si se sale por arriba
      if (topPosition < 10) {
        topPosition = 10
        submenu.style.maxHeight = `${menuRect.top - 20}px`
        submenu.style.overflowY = "auto"
      }
      
      submenu.style.top = `${topPosition}px`
    } else {
      // Mostrar abajo (comportamiento predeterminado)
      let topPosition = menuRect.top
      
      // Ajustar si se sale por abajo
      if (topPosition + submenuHeight > window.innerHeight - 10) {
        submenu.style.maxHeight = `${window.innerHeight - topPosition - 20}px`
        submenu.style.overflowY = "auto"
      } else {
        // Asegurar que siempre tenga overflow auto
        submenu.style.maxHeight = `${submenuHeight}px`
        submenu.style.overflowY = "auto"
      }
      
      submenu.style.top = `${topPosition}px`
    }
    
    // Caso especial para el menú de configuración - mostrar mucho más arriba
    if (item.id === "configuracion") {
      // Siempre mostrar en la parte superior
      submenu.style.top = "60px" // Dejando espacio para el header
      submenu.style.maxHeight = `${window.innerHeight - 80}px`
      submenu.style.overflowY = "auto"
    }
  }

  useEffect(() => {
    if ((isOpen || (isHovered && isCollapsed)) && hasSubmenu) {
      // Usar un pequeño retraso para dar tiempo a que el DOM se actualice
      const timer = setTimeout(() => {
        positionSubmenu()
        
        // Agregar event listener para resize
        window.addEventListener("resize", positionSubmenu)
      }, 10)
      
      return () => {
        clearTimeout(timer)
        window.removeEventListener("resize", positionSubmenu)
      }
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, isMobile])

  return (
    <div
      ref={menuRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start app-sidebar-item",
          isActive && "app-menu-active",
          depth > 0 && "pl-4",
          isCollapsed && "px-2",
        )}
        onClick={handleClick}
      >
        {item.icon && <item.icon className={cn("mr-2 h-4 w-4", isCollapsed && "mr-0")} />}
        {(!isCollapsed || depth > 0) && <span className="flex-1 text-left">{item.label}</span>}
        {(!isCollapsed || depth > 0) && item.badge && (
          <span className="ml-2 rounded-full bg-red-500 px-2 py-1 text-xs text-white">{item.badge}</span>
        )}
        {(!isCollapsed || depth > 0) && hasSubmenu && (
          isMobile ? 
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} /> :
            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        )}
      </Button>
      {hasSubmenu && (isOpen || (isHovered && isCollapsed)) && (
        <div
          ref={submenuRef}
          className={cn(
            "submenu rounded-md border bg-white shadow-lg",
            isMobile ? "w-full mt-1" : "w-64",
          )}
          style={{
            position: isMobile ? "relative" : "fixed",
            zIndex: 9999,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: isMobile ? "100%" : "16rem",
            overflow: "visible",
            overflowY: "auto"
          }}
        >
          {item.submenu!.map((subItem) => (
            <MenuItemComponent
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
              isCollapsed={false}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  )
} 