"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useRef, useEffect, useState } from "react"

export function Toaster() {
  const { toasts } = useToast()
  const [mounted, setMounted] = useState(false)
  
  // Usando useRef para evitar bucles de renderizado
  const viewportRef = useRef(null)
  
  // Montar solo en el lado del cliente
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return null
  }

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport ref={viewportRef} />
    </ToastProvider>
  )
} 