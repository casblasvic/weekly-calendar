"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { type MenuItem } from "@/config/menu-structure"

interface MenuItemProps {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
}

export function MenuItemComponent({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
}: MenuItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isActive = pathname === item.href
  const isOpen = openMenus.has(item.id)
  const [isHovered, setIsHovered] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasSubmenu) {
      toggleMenu(item.id)
    } else if (item.href) {
      router.push(item.href)
      toggleMenu("") // Close all menus when navigating
    }
  }

  useEffect(() => {
    if ((isOpen || (isHovered && isCollapsed)) && hasSubmenu && menuRef.current) {
      const updatePosition = () => {
        const menuRect = menuRef.current?.getBoundingClientRect()
        if (menuRect) {
          const submenu = menuRef.current?.querySelector(".submenu") as HTMLElement
          if (submenu) {
            submenu.style.position = "fixed"

            // Centrar el submenú verticalmente con respecto al elemento padre
            const subMenuHeight = submenu.offsetHeight
            const parentHeight = menuRect.height
            let topPosition = menuRect.top + parentHeight / 2 - subMenuHeight / 2

            // Ajustar si se sale por arriba o por abajo
            if (topPosition < 0) topPosition = 0
            if (topPosition + subMenuHeight > window.innerHeight) {
              topPosition = window.innerHeight - subMenuHeight
            }

            submenu.style.top = `${topPosition}px`
            submenu.style.left = `${menuRect.right}px`

            // Ajustar si se sale por la derecha
            const submenuRect = submenu.getBoundingClientRect()
            if (submenuRect.right > window.innerWidth) {
              submenu.style.left = `${menuRect.left - submenuRect.width}px`
            }

            // Asegurar que el submenú tenga scroll si es muy largo
            submenu.style.maxHeight = `${window.innerHeight}px`
            submenu.style.overflowY = "auto"
          }
        }
      }

      updatePosition()
      window.addEventListener("resize", updatePosition)
      return () => window.removeEventListener("resize", updatePosition)
    }
  }, [isOpen, isHovered, isCollapsed, hasSubmenu])

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
          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
        )}
      </Button>
      {hasSubmenu && (isOpen || (isHovered && isCollapsed)) && (
        <div
          className={cn(
            "submenu fixed left-full top-0 w-64 rounded-md border bg-white shadow-lg z-[9999]",
            isCollapsed ? "left-full" : "left-full",
          )}
        >
          {item.submenu!.map((subItem) => (
            <MenuItemComponent
              key={subItem.id}
              item={subItem}
              depth={depth + 1}
              isCollapsed={false}
              openMenus={openMenus}
              toggleMenu={toggleMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
} 