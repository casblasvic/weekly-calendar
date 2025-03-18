"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface SidebarPortalProps {
  children: React.ReactNode
}

export const SidebarPortal: React.FC<SidebarPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 2147483647, // Maximum z-index value
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

