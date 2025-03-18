"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface SidebarSubmenuProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  triggerRect: DOMRect | null
}

export const SidebarSubmenu: React.FC<SidebarSubmenuProps> = ({ isOpen, onClose, children, triggerRect }) => {
  const [mounted, setMounted] = useState(false)
  const submenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && submenuRef.current && !submenuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, onClose])

  if (!mounted) return null

  return createPortal(
    <div className={cn("fixed left-0 top-0 h-screen w-screen pointer-events-none", isOpen ? "z-[99999999]" : "z-0")}>
      <div
        ref={submenuRef}
        className={cn(
          "absolute bg-white rounded-md border shadow-lg overflow-hidden transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        style={{
          left: (triggerRect?.right || 0) + 4,
          top: (triggerRect?.top || 0) - 64, // Adjust for header height
          minWidth: "200px",
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

