"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronRight, Search, User, LogOut, Settings, CreditCard, Receipt } from "lucide-react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { menuItems, type MenuItem } from "@/config/menu-structure"
import { Input } from "@/components/ui/input"
import { useClinic } from "@/contexts/clinic-context"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onToggle?: () => void
}

interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
}

// Define user menu items with proper routes
const userMenuItems = [
  {
    id: "personal-data",
    label: "Editar datos personales",
    href: "/perfil/datos-personales",
    icon: User,
  },
  {
    id: "subscription",
    label: "Mi suscripción",
    href: "/perfil/suscripcion",
    icon: Settings,
  },
  {
    id: "billing-data",
    label: "Datos de facturación",
    href: "/perfil/facturacion",
    icon: CreditCard,
  },
  {
    id: "services",
    label: "Servicios contratados",
    href: "/perfil/servicios",
    icon: Settings,
  },
  {
    id: "invoices",
    label: "Facturas",
    href: "/perfil/facturas",
    icon: Receipt,
  },
]

const useMenuState = () => {
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set())

  const toggleMenu = useCallback((menuId: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(menuId)) {
        next.delete(menuId)
      } else {
        next.clear() // Cerrar todos los menús abiertos
        next.add(menuId)
      }
      return next
    })
  }, [])

  const closeAllMenus = useCallback(() => {
    setOpenMenus(new Set())
  }, [])

  return { openMenus, toggleMenu, closeAllMenus }
}

const MenuItemComponent = ({
  item,
  depth = 0,
  isCollapsed = false,
  openMenus,
  toggleMenu,
}: {
  item: MenuItem
  depth?: number
  isCollapsed?: boolean
  openMenus: Set<string>
  toggleMenu: (id: string) => void
}) => {
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
          "w-full justify-start",
          isActive && "bg-purple-50 text-purple-600",
          "hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
          depth > 0 && "pl-4",
          isCollapsed && "px-2",
        )}
        onClick={handleClick}
      >
        {item.icon && <item.icon className={cn("mr-2 h-4 w-4 text-purple-600", isCollapsed && "mr-0")} />}
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

const getClinicInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function MainSidebar({ className, isCollapsed, onToggle }: SidebarProps) {
  const { openMenus, toggleMenu, closeAllMenus } = useMenuState()
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const clinicRef = useRef<HTMLDivElement>(null)
  const clinicMenuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  const { activeClinic, setActiveClinic, clinics } = useClinic()
  const [clinicSearchTerm, setClinicSearchTerm] = useState("")
  const [isClinicSelectorOpen, setIsClinicSelectorOpen] = useState(false)
  const [isClinicHovered, setIsClinicHovered] = useState(false)

  const handleClinicSelect = (clinic: Clinic) => {
    setActiveClinic(clinic)
    setIsClinicSelectorOpen(false)
    setIsClinicHovered(false)
    setClinicSearchTerm("")
  }

  const filteredClinics = useMemo(() => {
    return clinics.filter(
      (clinic) =>
        clinic.name.toLowerCase().includes(clinicSearchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(clinicSearchTerm.toLowerCase()),
    )
  }, [clinics, clinicSearchTerm])

  useEffect(() => {
    const handleMouseLeave = () => {
      closeAllMenus()
      setHoveredMenu(null)
    }

    document.getElementById("main-sidebar")?.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.getElementById("main-sidebar")?.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [closeAllMenus])

  // Handle clicks outside the user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        const target = event.target as Node
        const sidebarElement = document.getElementById("main-sidebar")
        if (sidebarElement && !sidebarElement.contains(target)) {
          setShowUserMenu(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showUserMenu])

  // Handle clicks outside the clinic menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isClinicSelectorOpen || isClinicHovered) {
        const target = event.target as Node
        const sidebarElement = document.getElementById("main-sidebar")
        if (sidebarElement && !sidebarElement.contains(target)) {
          setIsClinicSelectorOpen(false)
          setIsClinicHovered(false)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isClinicSelectorOpen, isClinicHovered])

  // Close clinic menu when another menu is opened
  useEffect(() => {
    if (openMenus.size > 0 || showUserMenu) {
      setIsClinicSelectorOpen(false)
      setIsClinicHovered(false)
    }
  }, [openMenus, showUserMenu])

  // Position the user menu when it's shown
  useEffect(() => {
    if (showUserMenu && menuRef.current && avatarRef.current) {
      const avatarRect = avatarRef.current.getBoundingClientRect()
      const menuHeight = menuRef.current.offsetHeight

      // Calculate position that ensures the menu is fully visible
      const windowHeight = window.innerHeight
      const spaceBelow = windowHeight - avatarRect.bottom
      const spaceAbove = avatarRect.top

      if (menuHeight > spaceBelow && menuHeight <= spaceAbove) {
        // Position above if there's more space above than below
        menuRef.current.style.top = "auto"
        menuRef.current.style.bottom = "47px" // Lowered by 2px as requested
      } else {
        // Position below if there's more space below or not enough space above
        menuRef.current.style.bottom = "auto"
        menuRef.current.style.top = `${avatarRect.bottom + 5}px`
      }

      // Adjust horizontal position based on sidebar state
      if (isCollapsed) {
        menuRef.current.style.left = "16px" // Closer to collapsed sidebar
      } else {
        menuRef.current.style.left = "64px" // Normal position for expanded sidebar
      }
    }
  }, [showUserMenu, isCollapsed])

  // Position the clinic menu when it's shown
  useEffect(() => {
    if ((isClinicSelectorOpen || isClinicHovered) && clinicMenuRef.current && clinicRef.current) {
      const clinicRect = clinicRef.current.getBoundingClientRect()
      const menuHeight = clinicMenuRef.current.offsetHeight

      // Calculate position that ensures the menu is fully visible
      const windowHeight = window.innerHeight
      const spaceBelow = windowHeight - clinicRect.bottom

      // Position the menu to the right of the clinic selector
      if (menuHeight <= spaceBelow) {
        // If there's enough space below, position it there
        clinicMenuRef.current.style.top = `${clinicRect.top}px`
      } else {
        // If not enough space below, position it so it doesn't go off screen
        const topPosition = Math.max(0, windowHeight - menuHeight - 10)
        clinicMenuRef.current.style.top = `${topPosition}px`
      }

      // Adjust horizontal position based on sidebar state
      if (isCollapsed) {
        clinicMenuRef.current.style.left = "16px" // Closer to collapsed sidebar
      } else {
        clinicMenuRef.current.style.left = "64px" // Normal position for expanded sidebar
      }
    }
  }, [isClinicSelectorOpen, isClinicHovered, isCollapsed])

  return (
    <div
      ref={menuRef}
      id="main-sidebar"
      className={cn(
        "h-full border-r app-sidebar",
        isCollapsed ? "w-16" : "w-64",
        "transition-all duration-300 flex flex-col",
        className
      )}
    >
      {/* Clinic selector */}
      <div
        ref={clinicRef}
        className="relative p-2 border-b"
        onMouseEnter={() => setIsClinicHovered(true)}
        onMouseLeave={() => setIsClinicHovered(false)}
      >
        <div
          className="flex items-center cursor-pointer p-2 rounded-md app-sidebar-item hover:app-sidebar-hover"
          onClick={() => setIsClinicSelectorOpen(!isClinicSelectorOpen)}
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-purple-800">
              {getClinicInitials(activeClinic?.name || "Clínica")}
            </span>
          </div>
          {!isCollapsed && (
            <>
              <div className="ml-3 flex-1 truncate">
                <div className="font-medium truncate">{activeClinic?.name || "Selecciona clínica"}</div>
                <div className="text-xs text-gray-500">{activeClinic?.city || ""}</div>
              </div>
              <ChevronRight className={cn("h-4 w-4 ml-2", isClinicSelectorOpen && "rotate-90")} />
            </>
          )}
        </div>

        {(isClinicSelectorOpen || isClinicHovered) && (
          <div ref={clinicMenuRef} className="fixed w-80 rounded-md border bg-white shadow-lg z-[9999]">
            <div className="p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Buscar centros..."
                  value={clinicSearchTerm}
                  onChange={(e) => setClinicSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
                {filteredClinics.map((clinic) => (
                  <Button
                    key={clinic.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-3 py-2",
                      activeClinic.id === clinic.id ? "bg-green-50" : "hover:bg-purple-50",
                    )}
                    onClick={() => handleClinicSelect(clinic)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-sm font-medium text-purple-600">
                        {getClinicInitials(clinic.name)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{clinic.name}</div>
                        <div className="text-xs text-gray-500">{clinic.prefix}</div>
                      </div>
                      {activeClinic.id === clinic.id && <div className="h-2 w-2 rounded-full bg-green-500"></div>}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => (
          <MenuItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
            openMenus={openMenus}
            toggleMenu={toggleMenu}
          />
        ))}
      </div>

      {/* User menu */}
      <div className="border-t pt-2 pb-4">
        <div className="relative" ref={avatarRef}>
          <Button
            variant="ghost"
            className={cn("w-full justify-start app-sidebar-item hover:app-sidebar-hover", showUserMenu && "bg-purple-50")}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <Avatar className="h-8 w-8 mr-2">
              <AvatarFallback>RA</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Squad Chafiki</span>
                <span className="text-xs text-gray-500">usuario@example.com</span>
              </div>
            )}
          </Button>

          {showUserMenu && (
            <div
              ref={menuRef}
              className="fixed rounded-md border bg-white shadow-lg z-[9999] w-56"
              style={{ position: "fixed" }}
            >
              <div className="flex items-center gap-3 p-3 border-b">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>RA</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Squad Chafiki</span>
                  <span className="text-xs text-muted-foreground">usuario@example.com</span>
                </div>
              </div>
              <div className="py-1">
                {userMenuItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200",
                      pathname === item.href && "bg-purple-50 text-purple-600",
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4 text-purple-600" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="border-t py-1">
                <button className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Desconectar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

