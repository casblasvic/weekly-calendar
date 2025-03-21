"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRef, useEffect } from "react"
import { MainSidebar } from "@/components/main-sidebar"

interface MobileDrawerMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawerMenu({ isOpen, onClose }: MobileDrawerMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      onClose()
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevenir scroll en el body cuando el menú está abierto
      document.body.style.overflow = "hidden"
      // Asegurar que la barra lateral se muestra completa
      document.documentElement.classList.add('overflow-hidden')
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
      // Restaurar scroll cuando se cierra
      document.body.style.overflow = ""
      document.documentElement.classList.remove('overflow-hidden')
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onClose()
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("resize", handleResize)
      document.body.style.overflow = ""
      document.documentElement.classList.remove('overflow-hidden')
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop oscuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Barra lateral idéntica a desktop */}
          <motion.div
            ref={menuRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="fixed top-0 left-0 h-full z-50 overflow-hidden"
            style={{ width: "260px" }}
          >
            {/* Botón para cerrar */}
            <div className="absolute top-4 right-4 z-50">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Barra lateral con mejor soporte para submenus */}
            <div className="h-full w-full overflow-y-auto">
              <MainSidebar 
                isCollapsed={false} 
                className="h-full w-full !static border-0" 
                forceMobileView={true}
                allowHoverEffects={true}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

