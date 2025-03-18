import type React from "react"
import { ClinicProvider } from "@/context/clinic-context"
import { TarifProvider } from "@/contexts/tarif-context"
import { FamilyProvider } from "@/contexts/family-context"

export default function TarifasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClinicProvider>
      <TarifProvider>
        <FamilyProvider>
          {children}
        </FamilyProvider>
      </TarifProvider>
    </ClinicProvider>
  )
}

