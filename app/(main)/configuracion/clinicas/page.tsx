"use client"

import { useState, useMemo, useCallback, memo, useEffect, useRef } from "react"
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
import { toast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

interface Clinic {
  id: string | number
  prefix: string
  name: string
  city: string
  isActive: boolean
}

type SortField = "id" | "prefix" | "name" | "city"
type SortDirection = "asc" | "desc"

// 🚀 SOLUCIÓN DEFINITIVA: Componente con renderizado único estable
const ClinicasPage = memo(function ClinicasPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [sortField, setSortField] = useState<SortField>("id")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [showHelp, setShowHelp] = useState(false)

  const { clinics, updateClinica, isLoading } = useClinic()

  // 🎯 ESTADO CRÍTICO: Renderizado único
  const [isDataReady, setIsDataReady] = useState(false)
  const [stableClinics, setStableClinics] = useState<Clinic[]>([])
  const dataReadyRef = useRef(false)

  // 🎯 EFECTO CRÍTICO: Solo marcar como listo cuando tengamos datos reales
  useEffect(() => {
    if (!isLoading && clinics.length > 0 && !dataReadyRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [ClinicasPage] Datos realmente listos, marcando como renderizado único')
      }
      setStableClinics(clinics)
      setIsDataReady(true)
      dataReadyRef.current = true
    }
  }, [isLoading, clinics])

  // 🚀 MEMOIZACIÓN: Solo cuando los datos están estables
  const sortedClinics = useMemo(() => {
    if (!isDataReady) return []
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [ClinicasPage] Calculando sortedClinics UNA VEZ (length:', stableClinics.length, ')')
    }
    
    return [...stableClinics].sort((a, b) => {
      const modifier = sortDirection === "asc" ? 1 : -1
      if (a[sortField] < b[sortField]) return -1 * modifier
      if (a[sortField] > b[sortField]) return 1 * modifier
      return 0
    })
  }, [isDataReady, stableClinics, sortField, sortDirection])

  const filteredClinics = useMemo(() => {
    if (!isDataReady) return []
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [ClinicasPage] Calculando filteredClinics UNA VEZ (length:', sortedClinics.length, ')')
    }
    
    return sortedClinics.filter((clinic) => {
      const matchesSearch = 
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = showDisabled ? true : clinic.isActive;
      return matchesSearch && matchesStatus;
    })
  }, [isDataReady, sortedClinics, searchTerm, showDisabled])

  // 🚀 FUNCIONES MEMOIZADAS
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }, [sortField, sortDirection])

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }, [sortField, sortDirection])

  const toggleClinicStatus = useCallback(async (clinicId: string, currentStatus: boolean) => {
    const updatedClinicData = stableClinics.find(c => String(c.id) === clinicId);
    
    if (!updatedClinicData) {
      console.error(`No se encontró la clínica para actualizar con ID: ${clinicId}`);
      return;
    }
    
    const newStatus = !currentStatus;
    
    try {
      const success = await updateClinica(clinicId, { 
        ...updatedClinicData, 
        id: String(updatedClinicData.id),
        isActive: newStatus 
      });
      
      if (success) {
        // Actualizar el estado local inmediatamente para evitar flashes
        setStableClinics(prev => prev.map(c => 
          String(c.id) === clinicId ? { ...c, isActive: newStatus } : c
        ))
        
        toast({
          title: newStatus ? "Clínica activada" : "Clínica desactivada",
          description: `La clínica ${updatedClinicData.name} ha sido ${newStatus ? 'activada' : 'desactivada'}.`,
        });
      } else {
        throw new Error("La actualización no fue exitosa");
      }
    } catch (error) {
      console.error("Error al actualizar el estado de la clínica:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la clínica.",
        variant: "destructive",
      });
    }
  }, [stableClinics, updateClinica])

  const navigateToClinic = useCallback((clinicId: string | number) => {
    router.push(`/configuracion/clinicas/${clinicId}`)
  }, [router])

  // 🎯 RENDERIZADO CONDICIONAL: Solo mostrar cuando esté listo
  if (!isDataReady) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Gestión de clínicas</h1>
          <h2 className="text-lg text-gray-500">Listado de clínicas</h2>
        </div>

        <Card className="p-6">
                     <div className="mb-4 flex justify-end">
             <div className="flex items-center space-x-2">
               <Checkbox 
                 id="showDisabled" 
                 checked={showDisabled} 
                 onCheckedChange={(checked) => setShowDisabled(checked === true)}
                 disabled 
               />
               <Label htmlFor="showDisabled">Mostrar clínicas deshabilitadas</Label>
             </div>
           </div>
 
           <div className="relative mb-6">
             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
             <Input 
               placeholder="Buscador" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               disabled 
               className="pl-10" 
             />
           </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="w-[100px] text-center">Estado</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell className="w-[100px]"><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className="w-[100px] text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                    <TableCell className="w-[100px]">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="fixed bottom-16 md:bottom-8 left-0 right-0 px-4 flex items-center justify-end max-w-screen-xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button variant="outline" disabled>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              Nueva clínica
            </Button>
            <Button variant="secondary" className="bg-black text-white hover:bg-gray-900" disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              Ayuda
            </Button>
          </div>
        </div>

        <div className="h-32 md:h-20" />
      </div>
    )
  }

  // 🎯 RENDERIZADO FINAL: Solo cuando los datos están completamente listos
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Gestión de clínicas</h1>
        <h2 className="text-lg text-gray-500">Listado de clínicas</h2>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex justify-end">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showDisabled" 
              checked={showDisabled} 
              onCheckedChange={(checked) => setShowDisabled(checked === true)}
            />
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
                <TableHead className="w-[100px] text-center">Estado</TableHead>
                <TableHead className="w-[100px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClinics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No se encontraron clínicas con los filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
              {filteredClinics.map((clinic, index) => (
                <TableRow key={clinic.id} className={cn(index % 2 === 0 ? "bg-purple-50/50" : "")}>
                  <TableCell>{clinic.id}</TableCell>
                  <TableCell>{clinic.prefix}</TableCell>
                  <TableCell>{clinic.name}</TableCell>
                  <TableCell>{clinic.city}</TableCell>
                  <TableCell 
                    className="text-center cursor-pointer"
                    onClick={() => toggleClinicStatus(String(clinic.id), clinic.isActive)}
                  >
                    <span className={`px-2 py-1 text-xs rounded-full ${clinic.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {clinic.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </TableCell>
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
                        onClick={() => navigateToClinic(clinic.id)}
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

      <div className="h-32 md:h-20" />
    </div>
  )
})

export default ClinicasPage

