"use client"

import { useState, useEffect, use, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Eye, Calendar, Package, HelpCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BonoInstance {
  id: string
  purchaseDate: string
  expiryDate?: string
  remainingQuantity: number
  bonoDefinition: {
    id: string
    name: string
    description?: string
    quantity: number
    validityDays?: number
  }
  consumedItems: Array<{
    id: string
    quantity: number
    createdAt: string
    ticket?: {
      id: string
      ticketNumber: string
      createdAt: string
    }
  }>
}

// API para obtener bonos de la persona
async function getPersonBonos(personId: string): Promise<BonoInstance[]> {
  try {
    const response = await fetch(`/api/persons/${personId}/bonos`)
    if (!response.ok) {
      throw new Error("Error al obtener bonos")
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching bonos:", error)
    return []
  }
}

export default function BonosPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [bonos, setBonos] = useState<BonoInstance[]>([])
  const [loading, setLoading] = useState(true)

  const loadBonos = useCallback(async () => {
    setLoading(true)
    try {
      const bonosData = await getPersonBonos(resolvedParams.id)
      setBonos(bonosData)
    } catch (error) {
      console.error("Error loading bonos:", error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    loadBonos()
  }, [loadBonos])

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es })
    } catch {
      return "Fecha inválida"
    }
  }

  const getBonoStatus = (bono: BonoInstance) => {
    const now = new Date()
    const expiryDate = bono.expiryDate ? new Date(bono.expiryDate) : null
    
    if (bono.remainingQuantity <= 0) {
      return { status: "Agotado", color: "bg-gray-100 text-gray-800" }
    }
    
    if (expiryDate && now > expiryDate) {
      return { status: "Caducado", color: "bg-red-100 text-red-800" }
    }
    
    if (expiryDate && now > new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      return { status: "Próximo a caducar", color: "bg-yellow-100 text-yellow-800" }
    }
    
    return { status: "Activo", color: "bg-green-100 text-green-800" }
  }

  const getUsagePercentage = (bono: BonoInstance) => {
    const used = bono.bonoDefinition.quantity - bono.remainingQuantity
    return (used / bono.bonoDefinition.quantity) * 100
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Bonos contratados</h2>
          <div className="text-sm text-gray-500">
            {bonos.length} bono{bonos.length !== 1 ? 's' : ''} encontrado{bonos.length !== 1 ? 's' : ''}
          </div>
        </div>

        {bonos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No hay bonos contratados</p>
              <p>Esta persona no tiene bonos activos o históricos.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bonos.map((bono) => {
              const status = getBonoStatus(bono)
              const usagePercentage = getUsagePercentage(bono)
              
              return (
                <Card key={bono.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{bono.bonoDefinition.name}</CardTitle>
                        {bono.bonoDefinition.description && (
                          <p className="text-sm text-gray-600">{bono.bonoDefinition.description}</p>
                        )}
                      </div>
                      <Badge className={status.color}>
                        {status.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Información básica del bono */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Comprado:</span>
                        <span className="font-medium">{formatDate(bono.purchaseDate)}</span>
                      </div>
                      
                      {bono.expiryDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Caduca:</span>
                          <span className="font-medium">{formatDate(bono.expiryDate)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Sesiones:</span>
                        <span className="font-medium">
                          {bono.remainingQuantity} de {bono.bonoDefinition.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uso del bono</span>
                        <span className="font-medium">{Math.round(usagePercentage)}%</span>
                      </div>
                      <Progress value={usagePercentage} className="h-2" />
                    </div>

                    {/* Historial de consumo */}
                    {bono.consumedItems.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900">Historial de uso</h4>
                        <div className="max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Fecha</TableHead>
                                <TableHead className="text-xs">Ticket</TableHead>
                                <TableHead className="text-xs text-right">Sesiones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bono.consumedItems.slice(0, 5).map((item) => (
                                <TableRow key={item.id} className="text-xs">
                                  <TableCell>{formatDate(item.createdAt)}</TableCell>
                                  <TableCell>
                                    {item.ticket?.ticketNumber || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {bono.consumedItems.length > 5 && (
                            <div className="text-center py-2">
                              <Button variant="link" size="sm" className="text-xs">
                                Ver todos ({bono.consumedItems.length} usos)
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

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
