"use client"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { menuItems, type MenuItem } from "@/config/menu-structure"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClinic } from "@/contexts/clinic-context"
import { User, LogOut, Settings, FileText } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface MobileDrawerMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawerMenu({ isOpen, onClose }: MobileDrawerMenuProps) {
  const router = useRouter()
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { activeClinic, setActiveClinic, clinics } = useClinic()

  const handleNavigation = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleSubmenu = (item: MenuItem) => {
    if (item.submenu) {
      setActiveSubmenu(activeSubmenu === item.id ? null : item.id)
    } else {
      handleNavigation(item.href)
    }
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      onClose()
      setActiveSubmenu(null)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onClose()
        setActiveSubmenu(null)
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("resize", handleResize)
    }
  }, [isOpen, onClose])

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const Icon = item.icon
    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 mb-2 h-12 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200 ${
            depth > 0 ? "pl-8" : ""
          }`}
          onClick={() => handleSubmenu(item)}
        >
          <Icon className="h-4 w-4 text-purple-600" />
          {item.label}
          {item.submenu && (
            <ChevronRight className={`ml-auto h-4 w-4 ${activeSubmenu === item.id ? "rotate-90" : ""}`} />
          )}
        </Button>
        {item.submenu && activeSubmenu === item.id && (
          <div className="ml-4">{item.submenu.map((subItem) => renderMenuItem(subItem, depth + 1))}</div>
        )}
      </div>
    )
  }

  const handleClinicChange = (clinicId: string) => {
    const selectedClinic = clinics.find((clinic) => clinic.id.toString() === clinicId)
    if (selectedClinic) {
      setActiveClinic(selectedClinic)
      console.log("Clínica cambiada en móvil a:", selectedClinic.name) // Para depuración
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            ref={menuRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="fixed top-[64px] left-0 h-[calc(100vh-64px-64px)] w-4/5 max-w-xs bg-white z-50 flex flex-col"
          >
            <nav className="flex-1 p-4 overflow-y-auto max-h-full flex flex-col">
              {/* Clinic Selector at the top */}
              <div className="mb-4">
                <Select onValueChange={handleClinicChange} value={activeClinic.id.toString()}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id.toString()}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto">{menuItems.map((item) => renderMenuItem(item))}</div>

              {/* Profile Section at the bottom */}
              <div className="mt-auto pt-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 mb-2 h-12 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarFallback>RA</AvatarFallback>
                  </Avatar>
                  <span>Mi perfil</span>
                  <ChevronRight className={`ml-auto h-4 w-4 ${isProfileMenuOpen ? "rotate-90" : ""}`} />
                </Button>

                {isProfileMenuOpen && (
                  <div className="ml-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => {
                        handleNavigation("/perfil/datos-personales")
                      }}
                    >
                      <User className="h-4 w-4 text-purple-600" />
                      Editar datos personales
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => {
                        handleNavigation("/perfil/suscripcion")
                      }}
                    >
                      <Settings className="h-4 w-4 text-purple-600" />
                      Mi suscripción
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => {
                        handleNavigation("/perfil/facturacion")
                      }}
                    >
                      <FileText className="h-4 w-4 text-purple-600" />
                      Datos de facturación
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => {
                        handleNavigation("/perfil/servicios")
                      }}
                    >
                      <Settings className="h-4 w-4 text-purple-600" />
                      Servicios contratados
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 hover:text-purple-600 transition-colors duration-200"
                      onClick={() => {
                        handleNavigation("/perfil/facturas")
                      }}
                    >
                      <FileText className="h-4 w-4 text-purple-600" />
                      Facturas
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 mb-2 h-12 pl-8 hover:bg-purple-50 text-red-600 hover:text-red-700 transition-colors duration-200"
                      onClick={() => {
                        // Handle logout
                        onClose()
                      }}
                    >
                      <LogOut className="h-4 w-4 text-red-600" />
                      Desconectar
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

