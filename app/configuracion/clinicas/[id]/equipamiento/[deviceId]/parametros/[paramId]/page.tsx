"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Search, ArrowLeft, Plus, HelpCircle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ParameterValue {
  id: string
  description: string
}

export default function ParameterPage({
  params,
}: {
  params: { id: string; deviceId: string; paramId: string }
}) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewValueOpen, setIsNewValueOpen] = useState(false)
  const [newValue, setNewValue] = useState("")
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [parameterValues, setParameterValues] = useState<ParameterValue[]>([
    { id: "1", description: "Anticellulite" },
    { id: "2", description: "Drainage" },
  ])

  const filteredValues = parameterValues.filter((value) =>
    value.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddValue = () => {
    if (newValue.trim()) {
      setParameterValues((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          description: newValue.trim(),
        },
      ])
      setNewValue("")
      setIsNewValueOpen(false)
    }
  }

  const NewValueDialog = () => (
    <Dialog open={isNewValueOpen && !isMobile} onOpenChange={setIsNewValueOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo valor</DialogTitle>
        </DialogHeader>
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Descripción"
          className="my-4"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsNewValueOpen(false)}>
            Cancelar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddValue}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const NewValueSheet = () => (
    <Sheet open={isNewValueOpen && isMobile} onOpenChange={setIsNewValueOpen}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Nuevo valor</SheetTitle>
        </SheetHeader>
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Descripción"
          className="my-4"
        />
        <SheetFooter>
          <Button variant="outline" onClick={() => setIsNewValueOpen(false)}>
            Cancelar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleAddValue}>
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl pt-28 md:pt-16 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Parámetro {params.paramId}</h2>
        <p className="text-sm text-gray-500">
          Listado de valores del parámetro {params.paramId} para el equipo Ballancer
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          className="pl-10"
          placeholder="Buscador"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Card className="p-4">
        <div className="space-y-2">
          {filteredValues.map((value) => (
            <div key={value.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
              <span>{value.description}</span>
              <div className="w-4 h-4 bg-purple-600 rounded-sm" />
            </div>
          ))}
        </div>
      </Card>

      {/* Botones fijos inferiores */}
      <div className="fixed bottom-4 right-4 flex items-center space-x-2 z-50">
        <Button variant="outline" className="bg-white" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsNewValueOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo valor
        </Button>
        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Diálogo/Sheet para nuevo valor */}
      {isMobile ? <NewValueSheet /> : <NewValueDialog />}
    </div>
  )
}

