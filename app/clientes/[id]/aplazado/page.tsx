"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Printer, X, Search } from "lucide-react"
import { BackButton } from "@/components/ui/button"

interface DeferredPayment {
  clinic: string
  invoiceNumber?: string
  date: string
  client: string
  pendingAmount: string
}

export default function AplazadoPage() {
  const [showSettled, setShowSettled] = useState(false)

  const deferredPayments: DeferredPayment[] = [
    {
      clinic: "000001 - Californie Multilaser - Organicare",
      date: "04/11/2024",
      client: "Lina Sadaoui Sadaoui",
      pendingAmount: "2,000.00 MAD",
    },
    {
      clinic: "Calc - Calc Multilaser",
      date: "05/02/2025",
      client: "Lina Sadaoui Sadaoui",
      pendingAmount: "500.00 MAD",
    },
    {
      clinic: "Calc - Calc Multilaser",
      date: "24/02/2025",
      client: "Lina Sadaoui Sadaoui",
      pendingAmount: "150.00 MAD",
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Listado de pagos aplazados</h2>

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Clínica</TableHead>
              <TableHead>Nº Fact</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deferredPayments.map((payment, index) => (
              <TableRow key={index} className={index % 2 === 0 ? "bg-purple-50/50" : ""}>
                <TableCell className="font-medium">{payment.clinic}</TableCell>
                <TableCell>{payment.invoiceNumber}</TableCell>
                <TableCell>{payment.date}</TableCell>
                <TableCell>{payment.client}</TableCell>
                <TableCell className="text-right font-medium">{payment.pendingAmount}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="showSettled"
          checked={showSettled}
          onCheckedChange={(checked) => setShowSettled(checked as boolean)}
          className="checkbox-purple"
        />
        <Label htmlFor="showSettled">Ver pagos liquidados</Label>
      </div>

      {/* Fixed buttons */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        <BackButton>Volver</BackButton>
        <Button className="rounded-full bg-black text-white hover:bg-gray-800">Ayuda</Button>
      </div>
    </div>
  )
}

