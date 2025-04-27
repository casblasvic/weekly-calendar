"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, Mail, Phone, MapPin, FilePenLine, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useClient } from "@/contexts/client-context"
import ClientProfileImage from '@/components/ui/client-profile-image'

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const { getClientById } = useClient()

  useEffect(() => {
    const loadClient = async () => {
      try {
        const clientId = params.id as string
        const clientInfo = await getClientById(clientId)
        
        if (clientInfo) {
          // Asegurar que el cliente tenga un clinicId asignado
          if (!clientInfo.clinicId) {
            clientInfo.clinicId = "1"; // Asignar una clínica por defecto si no tiene
          }
          
          setClient(clientInfo)
        } else {
          console.error(`No se encontró el cliente con ID: ${clientId}`)
        }
      } catch (error) {
        console.error("Error al cargar el cliente:", error)
      } finally {
        setLoading(false)
      }
    }
    
    loadClient()
  }, [params.id, getClientById])

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  const handleEditClient = () => {
    router.push(`/clientes/${params.id}/editar`)
  }

  const handleDeleteClient = () => {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      console.log(`Deleted client ${params.id}`)
      router.push("/clientes")
    }
  }

  const handleBack = () => {
    router.push("/clientes")
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>
  }

  if (!client) {
    return (
      <div className="container py-6 mx-auto">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">Cliente no encontrado</h1>
          <Button onClick={handleBack}>Volver a la lista</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 mx-auto space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBack} className="mr-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEditClient}>
            <FilePenLine className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDeleteClient}>
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="flex flex-col items-center">
          <ClientProfileImage
            clientId={String(params.id)}
            clinicId={client.clinicId}
            initialImage={client.profileImage}
            editable={true}
            size="lg"
            onChange={(image) => {
              // Aquí podrías actualizar el estado del cliente si es necesario
            }}
          />
        </div>
        <Card className="lg:col-span-2">
          <Tabs defaultValue="visits">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Detalles del Cliente</CardTitle>
                <TabsList>
                  <TabsTrigger value="visits">Visitas</TabsTrigger>
                  <TabsTrigger value="notes">Notas</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="visits" className="space-y-4">
                <div className="border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                        >
                          Fecha
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                        >
                          Cabaña
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                        >
                          Duración
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                        >
                          Monto
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"
                        >
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {client.visits.map((visit: any) => (
                        <tr key={visit.id}>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(visit.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{visit.cabin}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{visit.duration}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">${visit.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={visit.status === "completed" ? "default" : "outline"}>
                              {visit.status === "completed" ? "Completada" : "Pendiente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-sm text-muted-foreground">Total de visitas: {client.visits.length}</div>
              </TabsContent>
              <TabsContent value="notes">
                <div className="space-y-4">
                  <div className="p-4 border rounded-md bg-gray-50">
                    <p className="text-sm whitespace-pre-line">{client.notes}</p>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

