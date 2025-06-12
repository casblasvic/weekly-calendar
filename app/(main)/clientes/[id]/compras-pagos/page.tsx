'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingBag, CreditCard, CheckCircle, XCircle, Clock, Calendar, User, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface Ticket {
  id: string
  ticketNumber: string
  createdAt: string
  totalPrice: number
  finalPrice: number
  paidAmount: number
  remainingAmount: number
  status: string
  type: string
  person?: {
    id: string
    firstName: string
    lastName: string
  }
  payerPerson?: {
    id: string
    firstName: string
    lastName: string
  }
  items?: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

interface Payment {
  id: string
  paymentNumber: string
  createdAt: string
  amount: number
  status: string
  paymentMethodCode: string
  tickets: Array<{
    id: string
    ticketNumber: string
    amount: number
    person?: {
      id: string
      firstName: string
      lastName: string
    }
  }>
}

export default function ComprasPagosPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const personId = resolvedParams.id
  const [loading, setLoading] = useState(true)
  const [ticketsAsReceiver, setTicketsAsReceiver] = useState<Ticket[]>([])
  const [ticketsAsPayer, setTicketsAsPayer] = useState<Ticket[]>([])
  const [paymentsAsPayer, setPaymentsAsPayer] = useState<Payment[]>([])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Obtener tickets como receptor (persona que recibe el servicio)
        const receiverResponse = await fetch(`/api/persons/${personId}/tickets-as-receiver`)
        if (receiverResponse.ok) {
          const receiverData = await receiverResponse.json()
          setTicketsAsReceiver(receiverData)
        }

        // Obtener tickets como pagador (persona que paga por otros)
        const payerTicketsResponse = await fetch(`/api/persons/${personId}/tickets-as-payer`)
        if (payerTicketsResponse.ok) {
          const payerTicketsData = await payerTicketsResponse.json()
          setTicketsAsPayer(payerTicketsData)
        }

        // Obtener pagos realizados por esta persona
        const paymentsResponse = await fetch(`/api/persons/${personId}/payments-as-payer`)
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setPaymentsAsPayer(paymentsData)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [personId])

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Compras y Pagos</h2>
        </div>

        <Tabs defaultValue="como-receptor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="como-receptor" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Como Receptor
            </TabsTrigger>
            <TabsTrigger value="como-pagador" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Como Pagador
            </TabsTrigger>
            <TabsTrigger value="pagos-realizados" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pagos Realizados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="como-receptor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Compras como Receptor
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Servicios y productos recibidos por esta persona
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
                          <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                          <TableCell>
                            {ticket.payerPerson ? (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{ticket.payerPerson.firstName} {ticket.payerPerson.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Misma persona</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(ticket.finalPrice)}</TableCell>
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
                  Servicios y productos pagados por esta persona para otros
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
                          <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                          <TableCell>
                            {ticket.person ? (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <span>{ticket.person.firstName} {ticket.person.lastName}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">No especificado</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(ticket.finalPrice)}</TableCell>
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
                  <User className="h-5 w-5" />
                  Pagos Realizados
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Historial de pagos realizados por esta persona
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
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell>
                            {payment.paymentMethodCode}
                          </TableCell>
                          <TableCell>
                            {payment.tickets.map((ticket) => (
                              <div key={ticket.id}>
                                <span>Ticket {ticket.ticketNumber}</span>
                                {ticket.person && (
                                  <div className="text-sm text-gray-500">
                                    Para: {ticket.person.firstName} {ticket.person.lastName}
                                  </div>
                                )}
                              </div>
                            ))}
                          </TableCell>
                          <TableCell>{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
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
