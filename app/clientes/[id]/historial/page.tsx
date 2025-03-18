"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, ArrowLeft, HelpCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { IconButton } from "@/components/ui/icon-button"
import { BackButton } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"

interface PlannedService {
  clinic: string
  service: string
  date: string
  startTime: string
  endTime: string
}

interface HistoryEntry {
  id: string
  clinic: string
  date: string
  family: string
  service: string
  session: string
  equipment: string
  i: string
  ii: string
  iii: string
  disI: string
  disF: string
  time: string
}

export default function HistorialPage() {
  const [showComments, setShowComments] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string[]>(["services", "products"])
  const [isNewCommentOpen, setIsNewCommentOpen] = useState(false)
  const [comment, setComment] = useState("")
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)

  const plannedServices: PlannedService[] = [
    {
      clinic: "Californie Multilaser - Organicare",
      service: "GBRS",
      date: "18/02/2025",
      startTime: "15:45",
      endTime: "16:00",
    },
    {
      clinic: "Californie Multilaser - Organicare",
      service: "GFCL",
      date: "20/02/2025",
      startTime: "16:30",
      endTime: "16:45",
    },
  ]

  const historyEntries: HistoryEntry[] = [
    {
      id: "1",
      clinic: "Calc Multilaser",
      date: "24/02/2025",
      family: "Forte Gem",
      service: "GEM Duvet epilation",
      session: "1",
      equipment: "-",
      i: "-",
      ii: "-",
      iii: "-",
      disI: "-",
      disF: "-",
      time: "15",
    },
    // Add more entries as needed
  ]

  const totalItems = historyEntries.length
  const totalPages = Math.ceil(totalItems / 50)
  const showPagination = totalItems > 50

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // Implement search logic
  }

  const handleTypeChange = (value: string[]) => {
    setSelectedType(value)
    // Implement filter logic
  }

  const handleSaveComment = () => {
    // Implement save logic
    console.log("Saving comment:", comment)
    setIsNewCommentOpen(false)
    setComment("")
  }

  return (
    <div className="space-y-6">
      {/* Planned Services Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Servicios Previstos</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="border-b">Clínica</TableHead>
                <TableHead className="border-b">Servicios</TableHead>
                <TableHead className="border-b">Fecha</TableHead>
                <TableHead className="border-b">Hora Inicio</TableHead>
                <TableHead className="border-b">Hora Fin</TableHead>
                <TableHead className="w-[50px] border-b"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plannedServices.map((service, index) => (
                <TableRow key={index} className={index % 2 === 1 ? "bg-purple-50" : ""}>
                  <TableCell className="border-b">{service.clinic}</TableCell>
                  <TableCell className="border-b">{service.service}</TableCell>
                  <TableCell className="border-b">{service.date}</TableCell>
                  <TableCell className="border-b">{service.startTime}</TableCell>
                  <TableCell className="border-b">{service.endTime}</TableCell>
                  <TableCell className="border-b">
                    <Button variant="ghost" size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* History Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Historial del cliente</h2>

        {/* Search and Filters */}
        <div className="mb-4 space-y-4">
          <Input
            placeholder="Buscar en el histórico de tratamientos"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-2xl"
          />

          <div className="flex items-center gap-4">
            <div className="w-[200px]">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Servicios, Productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Seleccionar todos</SelectItem>
                    <SelectItem value="services">Servicios</SelectItem>
                    <SelectItem value="products">Productos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showComments"
                checked={showComments}
                onCheckedChange={(checked) => setShowComments(checked as boolean)}
              />
              <Label htmlFor="showComments">Mostrar comentarios</Label>
            </div>

            <div className="ml-auto space-x-2">
              <Button variant="outline">Restablecer</Button>
              <Button className="bg-purple-600 hover:bg-purple-700">Buscar</Button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Familia</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Sesión</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>I</TableHead>
                <TableHead>II</TableHead>
                <TableHead>III</TableHead>
                <TableHead>Dis. I.</TableHead>
                <TableHead>Dis. F.</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.clinic}</TableCell>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.family}</TableCell>
                  <TableCell>{entry.service}</TableCell>
                  <TableCell>{entry.session}</TableCell>
                  <TableCell>{entry.equipment}</TableCell>
                  <TableCell>{entry.i}</TableCell>
                  <TableCell>{entry.ii}</TableCell>
                  <TableCell>{entry.iii}</TableCell>
                  <TableCell>{entry.disI}</TableCell>
                  <TableCell>{entry.disF}</TableCell>
                  <TableCell>{entry.time}</TableCell>
                  <TableCell>
                    <IconButton icon={<Search className="h-4 w-4" />} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Bottom controls */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between z-50">
          {/* Pagination - only shown if needed */}
          <div className="flex items-center gap-2">
            {showPagination && (
              <>
                <Button variant="outline" size="sm" disabled={currentPage === 1}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
                  Siguiente
                  <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                </Button>
              </>
            )}
          </div>

          {/* Action buttons - always visible */}
          <div className="flex items-center gap-2">
            <BackButton>Volver</BackButton>
            <Button variant="outline">Exportar</Button>
            <Button className="bg-purple-600 hover:bg-purple-700">Nueva conversión</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  Nuevo comentario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogTitle>Nuevo comentario</DialogTitle>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comment">Comentario</Label>
                    <Textarea
                      id="comment"
                      placeholder="Escribe tu comentario aquí..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={() => {
                      handleSaveComment()
                      setDialogOpen(false)
                    }}
                    className="rounded-lg bg-purple-600 px-6 hover:bg-purple-700"
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="rounded-full bg-black text-white hover:bg-gray-800">
              <HelpCircle className="h-4 w-4" />
              Ayuda
            </Button>
          </div>
        </div>

        {/* Spacer to prevent content from being hidden behind fixed buttons */}
        <div className="h-32 md:h-20"></div>
      </div>
    </div>
  )
}

