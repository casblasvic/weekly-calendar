"use client"

import type { ReactNode } from "react"
import { ClinicProvider } from "@/contexts/clinic-context"
import { TarifProvider } from "@/contexts/tarif-context"
import { FamilyProvider } from "@/contexts/family-context"
import { IVAProvider } from "@/contexts/iva-context"
import { ProductoProvider } from "@/contexts/producto-contexto"

export default function TarifasLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ClinicProvider>
      <TarifProvider>
        <FamilyProvider>
          <IVAProvider>
            <ProductoProvider>
              {children}
            </ProductoProvider>
          </IVAProvider>
        </FamilyProvider>
      </TarifProvider>
    </ClinicProvider>
  )
}

