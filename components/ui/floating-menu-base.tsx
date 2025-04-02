"use client"

import React, { useState, useEffect, useRef, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface FloatingMenuProps {
  isOpen: boolean
  onClose: () => void
  position?: {
    top?: number | string
    right?: number | string
    bottom?: number | string
    left?: number | string
  }
  width?: number | string
  title?: string
  children: ReactNode
  showBackButton?: boolean
  onBack?: () => void
}

export default function FloatingMenuBase({
  isOpen,
  onClose,
  position = { top: '100%', right: 0 },
  width = 280,
  title,
  children,
  showBackButton = false,
  onBack,
}: FloatingMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenuKey, setActiveSubmenuKey] = useState<string | null>(null)

  // Usar objetos de ref para acceder a los valores más recientes en el useEffect cleanup
  const isOpenRef = useRef(isOpen);
  const menuRefValue = useRef<HTMLDivElement | null>(null);

  // Mantener actualizada la ref con el valor actual
  useEffect(() => {
    isOpenRef.current = isOpen;
    menuRefValue.current = menuRef.current;
  });

  // Manejador para clics en el documento
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRefValue.current && !menuRefValue.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Manejador para la tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Variante para la animación
  const menuVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  }

  const positionStyle = {
    ...position,
    width,
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={menuVariants}
          transition={{ duration: 0.1 }}
          className="absolute z-50 bg-white rounded-md shadow-lg overflow-hidden"
          style={positionStyle}
        >
          {title && (
            <div className="flex items-center p-3 border-b border-gray-200 bg-gray-50">
              {showBackButton && (
                <button
                  onClick={onBack}
                  className="mr-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:bg-gray-200"
                >
                  <ChevronRight className="w-4 h-4 transform rotate-180" />
                </button>
              )}
              <h3 className="font-medium text-sm text-gray-700">{title}</h3>
            </div>
          )}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 