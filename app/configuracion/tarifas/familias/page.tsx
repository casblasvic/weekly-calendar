"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Pencil, ChevronDown, AlertCircle, Menu, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTarif } from "@/contexts/tarif-context"

export default function GestionFamilias() {
  const router = useRouter()
  const { familiasTarifa, addFamiliaTarifa, updateFamiliaTarifa, toggleFamiliaStatus, getFamiliasByTarifaId } = useTarif()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentFamily, setCurrentFamily] = useState<{
    id?: string
    name: string
    code: string
    parentId: string | null
    isActive: boolean
    tarifaId: string
  }>({
    name: "",
    code: "",
    parentId: null,
    isActive: true,
    tarifaId: "tarifa-california" // Cambiado de "tarifa-1"
  })
  const [isNewFamily, setIsNewFamily] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Obtenemos las familias de la tarifa actual
  const families = getFamiliasByTarifaId("tarifa-california") // Cambiado de "tarifa-1"

  // Filtrar familias según término de búsqueda y estado
  const filteredFamilies = families.filter((family) => {
    const matchesSearch = family.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = showDisabled ? true : family.isActive
    return matchesSearch && matchesStatus
  })

  const handleOpenNewFamilyDialog = () => {
    setCurrentFamily({
      name: "",
      code: "",
      parentId: null,
      isActive: true,
      tarifaId: "tarifa-california"
    })
    setIsNewFamily(true)
    setIsEditDialogOpen(true)
  }

  const handleOpenEditFamilyDialog = (family: typeof currentFamily & { id: string }) => {
    setCurrentFamily(family)
    setIsNewFamily(false)
    setIsEditDialogOpen(true)
  }

  const handleSaveFamily = () => {
    setIsSaving(true)

    setTimeout(() => {
      if (isNewFamily) {
        addFamiliaTarifa({
          name: currentFamily.name,
          code: currentFamily.code,
          parentId: currentFamily.parentId,
          isActive: currentFamily.isActive,
          tarifaId: currentFamily.tarifaId
        })
      } else if (currentFamily.id) {
        updateFamiliaTarifa(currentFamily.id, {
          name: currentFamily.name,
          code: currentFamily.code,
          parentId: currentFamily.parentId,
          isActive: currentFamily.isActive
        })
      }

      setIsSaving(false)
      setIsEditDialogOpen(false)
    }, 1000)
  }

  const handleToggleStatus = (id: string) => {
    toggleFamiliaStatus(id)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Familias de productos</h1>

      <div className="text-sm text-gray-600">
        Listado de familias de productos: <span className="font-semibold">Tarifa Base</span>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input
          className="pl-10 pr-4 py-2 w-full"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de familias */}
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-purple-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Familia a la que pertenece
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFamilies.map((family) => {
              const parentFamily = family.parentId ? families.find((f) => f.id === family.parentId) : null

              return (
                <tr key={family.id} className="hover:bg-purple-50/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parentFamily ? parentFamily.name : "(Ninguna)"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center">
                      {family.name}
                      {!family.isActive && (
                        <AlertCircle className="ml-2 h-4 w-4 text-amber-500" title="Familia deshabilitada" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{family.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    <div className="flex justify-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-purple-600 hover:text-purple-900">
                            <Menu size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditFamilyDialog(family)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Eliminar</DropdownMenuItem>
                          <DropdownMenuItem>Añadir subfamilia</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <button
                        className={`${family.isActive ? "text-green-600" : "text-gray-400"} hover:text-green-900`}
                        onClick={() => handleToggleStatus(family.id)}
                      >
                        <Check size={18} />
                      </button>

                      <button
                        className="text-purple-600 hover:text-purple-900"
                        onClick={() => handleOpenEditFamilyDialog(family)}
                      >
                        <Pencil size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredFamilies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron familias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Checkbox para mostrar familias deshabilitadas */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="verFamiliasDeshabilitadas"
          checked={showDisabled}
          onCheckedChange={(checked) => setShowDisabled(!!checked)}
        />
        <label htmlFor="verFamiliasDeshabilitadas" className="text-sm">
          Ver familias deshabilitadas
        </label>
      </div>

      {/* Botones de acción fijos */}
      <div className="fixed bottom-6 right-6 flex space-x-2">
        <Button variant="outline" onClick={() => router.push(`/configuracion/tarifas/${router.query?.id || ""}`)}>
          Volver
        </Button>
        <Button variant="default" className="bg-purple-800 hover:bg-purple-900" onClick={handleOpenNewFamilyDialog}>
          Nueva familia
        </Button>
        <Button variant="outline" className="bg-black text-white hover:bg-gray-800">
          Ayuda
        </Button>
      </div>

      {/* Modal de edición/creación de familia */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>{isNewFamily ? "Nueva familia" : "Editar familia"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label htmlFor="parentFamily" className="text-sm font-medium">
                Familia a la que pertenece
              </label>
              <Select
                value={currentFamily.parentId || ""}
                onValueChange={(value) => setCurrentFamily({ ...currentFamily, parentId: value || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="(Ninguna)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(Ninguna)</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Código
              </label>
              <Input
                id="code"
                value={currentFamily.code}
                onChange={(e) => setCurrentFamily({ ...currentFamily, code: e.target.value })}
                className="w-full"
                maxLength={3}
                placeholder="Máximo 3 caracteres"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="name"
                value={currentFamily.name}
                onChange={(e) => setCurrentFamily({ ...currentFamily, name: e.target.value })}
                className="w-full"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="isActive"
                checked={currentFamily.isActive}
                onCheckedChange={(checked) => setCurrentFamily({ ...currentFamily, isActive: !!checked })}
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Deshabilitada
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveFamily}
              disabled={!currentFamily.name || !currentFamily.code || isSaving}
              className="relative"
            >
              {isSaving ? (
                <>
                  <span className="opacity-0">Guardar</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

