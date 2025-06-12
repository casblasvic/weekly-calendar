'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShoppingCart, CreditCard, User, Building, Calendar, Euro, FileText, ArrowUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TicketData {
  id: string
  ticketNumber: string
  issueDate: string
  totalAmount: number
  finalAmount: number
  status: string
  type: string
  client?: {
    id: string
    firstName: string
    lastName: string
  }
  payerClient?: {
    id: string
    firstName: string
    lastName: string
  }
  payerCompany?: {
    id: string
    name: string
  }
  clinic: {
    name: string
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

interface PaymentData {
  id: string
  amount: number
  paymentDate: string
  type: string
  status?: string
  paymentMethodDefinition?: {
    name: string
  }
  ticket?: {
    id: string
    ticketNumber: string
    client?: {
      firstName: string
      lastName: string
    }
  }
  invoice?: {
    id: string
    invoiceNumber: string
  }
}

export default function ComprasPagosPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const clientId = resolvedParams.id
  
  const [ticketsAsReceiver, setTicketsAsReceiver] = useState<TicketData[]>([])
  const [ticketsAsPayer, setTicketsAsPayer] = useState<TicketData[]>([])
  const [paymentsAsPayer, setPaymentsAsPayer] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Obtener tickets como receptor (cliente que recibe el servicio)
        const receiverResponse = await fetch(`/api/clients/${clientId}/tickets-as-receiver`)
        if (receiverResponse.ok) {
          const receiverData = await receiverResponse.json()
          setTicketsAsReceiver(receiverData)
        }

        // Obtener tickets como pagador (cliente que paga por otros)
        const payerTicketsResponse = await fetch(`/api/clients/${clientId}/tickets-as-payer`)
        if (payerTicketsResponse.ok) {
          const payerTicketsData = await payerTicketsResponse.json()
          setTicketsAsPayer(payerTicketsData)
        }

        // Obtener pagos realizados por este cliente
        const paymentsResponse = await fetch(`/api/clients/${clientId}/payments-as-payer`)
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setPaymentsAsPayer(paymentsData)
        }

      } catch (error) {
        console.error('Error fetching compras y pagos data:', error)
        setError('Error al cargar los datos de compras y pagos')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es })
    } catch {
      return 'Fecha inválida'
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      OPEN: { label: 'Abierto', variant: 'default' },
      PAID: { label: 'Pagado', variant: 'secondary' },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' },
      REFUNDED: { label: 'Devuelto', variant: 'outline' }
    }
    
    const statusInfo = statusMap[status] || { label: status, variant: 'default' }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Compras y Pagos</h2>
        </div>

        <Tabs defaultValue="como-receptor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="como-receptor" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Como Receptor
            </TabsTrigger>
            <TabsTrigger value="como-pagador" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Como Pagador
            </TabsTrigger>
            <TabsTrigger value="pagos-realizados" className="flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Pagos Realizados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="como-receptor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Compras como Receptor
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Servicios y productos recibidos por este cliente
                </p>
              </CardHeader>
              <CardContent>
                {ticketsAsReceiver.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay compras registradas como receptor</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Clínica</TableHead>
                        <TableHead>Pagador</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketsAsReceiver.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                          <TableCell>{formatDate(ticket.issueDate)}</TableCell>
                          <TableCell>{ticket.clinic.name}</TableCell>
                          <TableCell>
                            {ticket.payerClient ? (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{ticket.payerClient.firstName} {ticket.payerClient.lastName}</span>
                              </div>
                            ) : ticket.payerCompany ? (
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span>{ticket.payerCompany.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Mismo cliente</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(ticket.finalAmount)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Ver Detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="como-pagador" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Compras como Pagador
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Servicios y productos pagados por este cliente para otros
                </p>
              </CardHeader>
              <CardContent>
                {ticketsAsPayer.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay compras registradas como pagador</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Clínica</TableHead>
                        <TableHead>Receptor</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketsAsPayer.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                          <TableCell>{formatDate(ticket.issueDate)}</TableCell>
                          <TableCell>{ticket.clinic.name}</TableCell>
                          <TableCell>
                            {ticket.client ? (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{ticket.client.firstName} {ticket.client.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">No especificado</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(ticket.finalAmount)}</TableCell>
                          <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Ver Detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pagos-realizados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Pagos Realizados
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Historial de pagos realizados por este cliente
                </p>
              </CardHeader>
              <CardContent>
                {paymentsAsPayer.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay pagos registrados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsAsPayer.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>
                            {payment.paymentMethodDefinition?.name || 'No especificado'}
                          </TableCell>
                          <TableCell>
                            {payment.ticket ? (
                              <div>
                                <span>Ticket {payment.ticket.ticketNumber}</span>
                                {payment.ticket.client && (
                                  <div className="text-sm text-gray-500">
                                    Para: {payment.ticket.client.firstName} {payment.ticket.client.lastName}
                                  </div>
                                )}
                              </div>
                            ) : payment.invoice ? (
                              <span>Factura {payment.invoice.invoiceNumber}</span>
                            ) : (
                              <span>Pago directo</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            {payment.status ? getStatusBadge(payment.status) : <Badge>Completado</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
