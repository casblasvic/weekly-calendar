"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Calendar, DollarSign, HelpCircle, Search, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { MobileClientList } from "@/components/mobile/client/client-list"
import { ExportButton } from "@/components/ExportButton"

export default function BusquedaPage() {
  const [searchParams, setSearchParams] = useState({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    telefono: "",
    numeroCliente: "",
  })
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const [sortColumn, setSortColumn] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>("asc")

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const mockClients = [
    {
      id: "1",
      name: "Lina Sadaoui Sadaoui",
      clientNumber: "6557",
      phone: "+212622742529",
      email: "linasadaoui@gmail.com",
      clinic: "Multilaser Californie",
    },
    {
      id: "2",
      name: "saadaoui lina saadaoui",
      clientNumber: "1249",
      phone: "+212622742529",
      email: "ls.organicare@gmail.com",
      clinic: "Multilaser Californie",
    },
  ]

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc")
    } else {
      setSortColumn(column)
      setSortOrder("asc")
    }
  }

  const sortedClients = [...mockClients].sort((a, b) => {
    if (!sortColumn || !sortOrder) return 0
    const order = sortOrder === "asc" ? 1 : -1
    switch (sortColumn) {
      case "id":
        return a.id.localeCompare(b.id) * order
      case "cliente":
        return a.name.localeCompare(b.name) * order
      case "email":
        return a.email.localeCompare(b.email) * order
      case "telefono":
        return a.phone.localeCompare(b.phone) * order
      default:
        return 0
    }
  })

  if (isMobile) {
    return <MobileClientList />
  }

  return (
    <div className="space-y-6 pt-16 px-4 md:px-6">
      <Card className="p-6 border-purple-200 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-medium">Buscador de clientes</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            placeholder="Nombre"
            value={searchParams.nombre}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, nombre: e.target.value }))}
          />
          <Input
            placeholder="Primer apellido"
            value={searchParams.primerApellido}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, primerApellido: e.target.value }))}
          />
          <Input
            placeholder="Segundo apellido"
            value={searchParams.segundoApellido}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, segundoApellido: e.target.value }))}
          />
          <Input
            placeholder="Teléfono"
            value={searchParams.telefono}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, telefono: e.target.value }))}
          />
          <Input
            placeholder="Nº Cliente"
            value={searchParams.numeroCliente}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, numeroCliente: e.target.value }))}
            className="w-28"
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <ExportButton data={sortedClients} filename="clientes" />
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">Buscar</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("id")} className="cursor-pointer w-[100px]">
                    ID {sortColumn === "id" && (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("cliente")} className="cursor-pointer">
                    Cliente {sortColumn === "cliente" && (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("email")} className="cursor-pointer">
                    Email {sortColumn === "email" && (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("telefono")} className="cursor-pointer">
                    Teléfono{" "}
                    {sortColumn === "telefono" && (sortOrder === "asc" ? "▲" : sortOrder === "desc" ? "▼" : "")}
                  </TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.id}</TableCell>
                    <TableCell>{cliente.name}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => router.push(`/clientes/${cliente.id}/aplazado`)}
                        >
                          <span className="font-bold text-lg">A</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-500 hover:bg-green-50 hover:text-green-600"
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-purple-500 hover:bg-purple-50 hover:text-purple-600"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => router.push(`/clientes/${cliente.id}`)}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button className="gap-2 rounded-full bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
          Ayuda
        </Button>
      </div>
    </div>
  )
}

