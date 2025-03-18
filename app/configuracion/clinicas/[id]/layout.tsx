"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"

export default function ClinicaLayout({ children, params }: { children: ReactNode; params: { id: string } }) {
  const pathname = usePathname()

  return <div className="relative min-h-screen">{children}</div>
}

