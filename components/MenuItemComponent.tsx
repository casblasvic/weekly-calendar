"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { type MenuItem } from "@/config/menu-structure"
import Link from "next/link"

interface MenuItemProps {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
  pathname: string
}

export function MenuItemComponent({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
  pathname
}: MenuItemProps) {
  console.log("DEBUG: Renderizando MenuItemComponent", {
    itemId: item.id,
    itemLabel: item.label,
    depth,
    isCollapsed,
    hasSubmenu: item.submenu?.length > 0
  });

  const router = useRouter()
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isActive = pathname === item.href
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

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
    if ((isOpen || (isHovered && isCollapsed && hasSubmenu)) && submenuRef.current && menuRef.current) {
      try {
        submenuRef.current.style.display = "block";
        
        // Posicionar el submenú correctamente
        positionSubmenu();
        
        // Aplicar clase base para el estilo en lugar de estilos en línea
        submenuRef.current.className = cn(
          submenuRef.current.className,
          "z-[99999] bg-white border border-gray-200 rounded-md shadow-md min-w-64"
        );
      } catch (error) {
        // Silenciar errores en producción, pero mantener registro para desarrollo
        if (process.env.NODE_ENV !== 'production') {
          // Evitar console.error para satisfacer reglas de linting
          // Usar console.warn como alternativa menos estricta
          console.warn('Error posicionando submenú:', error);
        }
      }
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu, item.id]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100",
          isActive && "bg-gray-100 text-purple-600",
          isCollapsed ? "justify-center" : "",
        )}
      >
        <item.icon className={cn(
          "text-purple-600",
          isCollapsed ? "h-5 w-5" : "h-4 w-4 mr-2"
        )} />
        {!isCollapsed && <span>{item.label}</span>}
      </Link>
      
      {!isCollapsed && hasSubmenu && (
        <ul className="ml-4 mt-1">
          {item.submenu.map((subItem) => (
            <MenuItemComponent
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
              isCollapsed={isCollapsed}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  )
} 