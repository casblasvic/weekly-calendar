"use client"

import { useState, useEffect, use } from "react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Printer, X, Search, HelpCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DeferredPayment {
  id: string
  amount: number
  paymentDate: string
  status?: string
  notes?: string
  clinic?: {
    id: string
    name: string
    code: string
  }
  ticket?: {
    id: string
    ticketNumber: string
  }
  invoice?: {
    id: string
    invoiceNumber: string
  }
  paymentMethodDefinition?: {
    name: string
    type: string
  }
}

// API para obtener pagos aplazados del cliente
async function getDeferredPayments(clientId: string): Promise<DeferredPayment[]> {
  try {
    const response = await fetch(`/api/clients/${clientId}/deferred-payments`)
    if (!response.ok) {
      throw new Error("Error al obtener pagos aplazados")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching deferred payments:", error)
    return []
  }
}

export default function AplazadoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [showSettled, setShowSettled] = useState(false)
  const [deferredPayments, setDeferredPayments] = useState<DeferredPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDeferredPayments()
  }, [resolvedParams.id])

  const loadDeferredPayments = async () => {
    setLoading(true)
    try {
      const payments = await getDeferredPayments(resolvedParams.id)
      setDeferredPayments(payments)
    } catch (error) {
      console.error("Error loading deferred payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "Fecha inválida"
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <h2 className="text-lg font-medium">Listado de pagos aplazados</h2>

        <Card>
          {deferredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No hay pagos aplazados registrados para este cliente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Clínica</TableHead>
                  <TableHead>Nº Fact/Ticket</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método de pago</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deferredPayments.map((payment, index) => (
                  <TableRow key={payment.id} className={index % 2 === 0 ? "bg-purple-50/50" : ""}>
                    <TableCell className="font-medium">
                      {payment.clinic ? `${payment.clinic.code} - ${payment.clinic.name}` : "Clínica no especificada"}
                    </TableCell>
                    <TableCell>
                      {payment.invoice?.invoiceNumber || payment.ticket?.ticketNumber || "-"}
                    </TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{payment.paymentMethodDefinition?.name || "Pago aplazado"}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      -{formatAmount(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {payment.status || "Pendiente"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          title="Imprimir"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-50"
                          title="Ver detalles"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showSettled"
            checked={showSettled}
            onCheckedChange={(checked) => setShowSettled(checked as boolean)}
          />
          <Label htmlFor="showSettled" className="text-sm">
            Mostrar pagos liquidados
          </Label>
        </div>

        {/* Botones de acción fijos */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2 z-50">
          <Button
            variant="outline"
            className="rounded-full bg-black text-white hover:bg-gray-800"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Espaciador para evitar que el contenido se oculte detrás de los botones */}
        <div className="h-16"></div>
      </div>
    </div>
  )
}
