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
import { usePersonClientsQuery } from "@/lib/hooks/use-person-query"

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
  const [searchQuery, setSearchQuery] = useState("")

  // Obtener datos reales de la base de datos
  const { data: clients = [], isLoading, error } = usePersonClientsQuery({
    search: searchQuery
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Función para realizar la búsqueda
  const handleSearch = () => {
    const searchTerms = [
      searchParams.nombre,
      searchParams.primerApellido,
      searchParams.segundoApellido,
      searchParams.telefono,
      searchParams.numeroCliente
    ].filter(term => term.trim() !== "").join(" ")
    
    setSearchQuery(searchTerms)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc")
    } else {
      setSortColumn(column)
      setSortOrder("asc")
    }
  }

  const sortedClients = [...clients].sort((a, b) => {
    if (!sortColumn || !sortOrder) return 0
    const order = sortOrder === "asc" ? 1 : -1
    switch (sortColumn) {
      case "id":
        return a.id.localeCompare(b.id) * order
      case "cliente":
        const nameA = `${a.firstName} ${a.lastName}`
        const nameB = `${b.firstName} ${b.lastName}`
        return nameA.localeCompare(nameB) * order
      case "email":
        return (a.email || "").localeCompare(b.email || "") * order
      case "telefono":
        return (a.phone || "").localeCompare(b.phone || "") * order
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
        <Button 
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {error && (
              <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md m-4">
                Error al cargar los clientes: {error.message}
              </div>
            )}
            
            {isLoading && (
              <div className="p-8 text-center text-gray-500">
                Cargando clientes...
              </div>
            )}

            {!isLoading && !error && (
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
                  {sortedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {searchQuery ? "No se encontraron clientes con los criterios de búsqueda" : "No hay clientes para mostrar"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedClients.map((cliente) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.id}</TableCell>
                        <TableCell>{`${cliente.firstName} ${cliente.lastName}`}</TableCell>
                        <TableCell>{cliente.email || "-"}</TableCell>
                        <TableCell>{cliente.phone || "-"}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            )}
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
