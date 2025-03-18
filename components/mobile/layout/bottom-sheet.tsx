"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  showClose?: boolean
  height?: "auto" | "full"
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  children,
  title,
  showClose = true,
  height = "auto",
}: MobileBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50"
            style={{
              zIndex: 9999,
              position: "fixed",
              pointerEvents: "auto",
            }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl overflow-hidden ${
              height === "full" ? "h-[90vh]" : ""
            }`}
            style={{
              zIndex: 10000,
              position: "fixed",
              pointerEvents: "auto",
            }}
          >
            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                {title && <h2 className="text-lg font-medium">{title}</h2>}
                {showClose && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={`${height === "full" ? "max-h-[calc(90vh-4rem)] overflow-y-auto" : ""}`}>{children}</div>

            {/* Safe Area Spacing for iOS */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

