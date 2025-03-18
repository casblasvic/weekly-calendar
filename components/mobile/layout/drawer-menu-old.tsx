"use client"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileDrawerMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawerMenu({ isOpen, onClose }: MobileDrawerMenuProps) {
  const menuItems = [
    { label: "Inicio", href: "/" },
    { label: "Agenda", href: "/agenda" },
    { label: "Clientes", href: "/clientes" },
    { label: "Estadísticas", href: "/estadisticas" },
    { label: "Configuración", href: "/configuracion" },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 h-full w-4/5 max-w-xs bg-white shadow-lg z-50"
          >
            <div className="flex justify-end p-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="px-4">
              {menuItems.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className="block py-2 text-lg text-gray-800 hover:text-purple-600 transition-colors"
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

