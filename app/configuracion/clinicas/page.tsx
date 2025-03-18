"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, QrCode, ArrowLeft, HelpCircle, ChevronUp, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useClinic } from "@/contexts/clinic-context"
import { Label } from "@/components/ui/label"

interface Clinic {
  id: number
  prefix: string
  name: string
  city: string
}

type SortField = "id" | "prefix" | "name" | "city"
type SortDirection = "asc" | "desc"

export default function ClinicasPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("id")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showHelp, setShowHelp] = useState(false)

  const { clinics, setClinics } = useClinic()

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const sortedClinics = [...clinics].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1
    if (a[sortField] < b[sortField]) return -1 * modifier
    if (a[sortField] > b[sortField]) return 1 * modifier
    return 0
  })

  const filteredClinics = sortedClinics.filter(
    (clinic) =>
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.city.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Gestión de clínicas</h1>
        <h2 className="text-lg text-gray-500">Listado de clínicas</h2>
      </div>

      <Card className="p-6">
        {/* Add filter above search bar */}
        <div className="mb-4 flex justify-end">
          <div className="flex items-center space-x-2">
            <Checkbox id="showDisabled" checked={showDisabled} onCheckedChange={setShowDisabled} />
            <Label htmlFor="showDisabled">Mostrar clínicas deshabilitadas</Label>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscador"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("id")}>
                  <div className="flex items-center gap-2">
                    ID
                    {getSortIcon("id")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("prefix")}>
                  <div className="flex items-center gap-2">
                    Prefijo
                    {getSortIcon("prefix")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-2">
                    Nombre
                    {getSortIcon("name")}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("city")}>
                  <div className="flex items-center gap-2">
                    Ciudad
                    {getSortIcon("city")}
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClinics.map((clinic, index) => (
                <TableRow key={clinic.id} className={cn(index % 2 === 0 ? "bg-purple-50/50" : "")}>
                  <TableCell>{clinic.id}</TableCell>
                  <TableCell>{clinic.prefix}</TableCell>
                  <TableCell>{clinic.name}</TableCell>
                  <TableCell>{clinic.city}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                        onClick={() => router.push(`/configuracion/clinicas/${clinic.id}`)}
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
      </Card>

      {/* Bottom controls - Updated styling */}
      <div className="fixed bottom-16 md:bottom-8 left-0 right-0 px-4 flex items-center justify-end max-w-screen-xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => router.push("/configuracion/clinicas/nueva")}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva clínica
          </Button>
          <Button
            variant="secondary"
            className="bg-black text-white hover:bg-gray-900"
            onClick={() => setShowHelp(true)}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Ayuda
          </Button>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-32 md:h-20" />
    </div>
  )
}

