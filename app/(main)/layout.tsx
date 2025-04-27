"use client"

import { LayoutWrapper } from "@/components/LayoutWrapper"

// Este layout envuelve todas las páginas protegidas que necesitan la interfaz principal
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <LayoutWrapper>{children}</LayoutWrapper>
} 