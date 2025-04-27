"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { TarifProvider } from "@/contexts/tarif-context"

export default function ClinicaLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  const pathname = usePathname()

  return (
    <TarifProvider>
      <div className="relative min-h-screen">{children}</div>
    </TarifProvider>
  )
}

