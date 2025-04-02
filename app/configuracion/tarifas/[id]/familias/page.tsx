"use client"

import { useState, useMemo, useEffect } from "react"
// Importar useParams
import { useRouter, useParams } from "next/navigation"
import { Search, Pencil, ChevronDown, AlertCircle, Menu, Check, Trash2, ChevronUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTarif } from "@/contexts/tarif-context"
import { toast } from "sonner"

export default function GestionFamilias() {
  const router = useRouter()
  // Obtener el ID de la tarifa de los parámetros de la URL
  const params = useParams()
  const tarifaId = params.id as string // Asumiendo que el parámetro se llama 'id'

  // Obtener familiasTarifa Y la lista completa de tarifas para la guarda
  const { familiasTarifa, addFamiliaTarifa, updateFamiliaTarifa, toggleFamiliaStatus, getFamiliasByTarifaId, tarifas: todasLasTarifas } = useTarif()
  const [searchTerm, setSearchTerm] = useState("")
  const [showDisabled, setShowDisabled] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [familyToDelete, setFamilyToDelete] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  
  // Estado original de currentFamily restaurado
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
    // Usar el tarifaId dinámico al inicializar, si existe
    tarifaId: tarifaId || "" 
  })
  
  // Estados originales restaurados
  const [isNewFamily, setIsNewFamily] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [families, setFamilies] = useState<any[]>([])
  
  // Ya no hay TARIFA_ID harcodeado
  
  useEffect(() => {
    const loadFamilies = async () => {
      // *** GUARDA MEJORADA: Esperar a que las tarifas generales estén listas ***
      // Si no hay tarifas generales, asumimos que el contexto aún no ha cargado
      // los datos base necesarios para obtener las familias correctamente.
      if (!todasLasTarifas || todasLasTarifas.length === 0) {
         console.log("[familias/page.tsx] Esperando a que se carguen las tarifas generales (y por ende, familias) del contexto...");
         return; 
      }
      
      if (tarifaId) { 
        try {
          console.log("[familias/page.tsx] Intentando cargar familias para tarifa (tarifas generales listas):", tarifaId);
          const familiesData = await getFamiliasByTarifaId(tarifaId);
          console.log('[familias/page.tsx] Datos recibidos de getFamiliasByTarifaId:', JSON.stringify(familiesData)); 
          setFamilies(Array.isArray(familiesData) ? familiesData : []);
        } catch (error) {
          console.error(`[familias/page.tsx] Error al cargar familias para tarifa ${tarifaId}:`, error);
          setFamilies([]);
        }
      } else {
         console.warn("[familias/page.tsx] No se proporcionó tarifaId para cargar familias.");
         setFamilies([]);
      }
    };
    loadFamilies();
  // Quitar familiasTarifa de las dependencias
  }, [getFamiliasByTarifaId, tarifaId, todasLasTarifas]);

  // ... (requestSort, getSortIcon, filteredFamilies, filteredAndSortedFamilies - restaurados como estaban)
  // Solicitar ordenación de una columna
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Obtener ícono de ordenación para la columna
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} />;
    }
    return sortConfig.direction === 'ascending' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };

  // Filtrar familias según los criterios de búsqueda y visibilidad
  const filteredFamilies = useMemo(() => {
    const familiesArray = Array.isArray(families) ? families : [];
    return familiesArray.filter(familia => {
      // Usar familia.nombre y manejar familia.code opcional
      const nameMatch = familia.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = familia.code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSearch = !searchTerm || nameMatch || codeMatch;
      const matchesStatus = showDisabled || familia.isActive;
      return matchesSearch && matchesStatus;
    });
  }, [families, searchTerm, showDisabled]);

  // Filtrar y ordenar familias
  const filteredAndSortedFamilies = useMemo(() => {
    console.log("[familias/page.tsx] useMemo calculando filteredAndSortedFamilies. Estado families:", JSON.stringify(families));
    let sorted = [...filteredFamilies];
    if (sortConfig !== null) {
      sorted.sort((a, b) => {
        // Adaptar para usar nombre y manejar code/parentId opcionales
        let aValue, bValue;
        if (sortConfig.key === 'name') {
            aValue = a.nombre;
            bValue = b.nombre;
        } else {
            aValue = a[sortConfig.key as keyof typeof a];
            bValue = b[sortConfig.key as keyof typeof b];
        }

        // Comparación insensible a mayúsculas/minúsculas para strings
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Manejar nulos/undefined en la comparación
        if (aValue === null || aValue === undefined) return 1; // Mover nulos/undefined al final
        if (bValue === null || bValue === undefined) return -1;

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        
        return 0;
      });
    }
    console.log("[familias/page.tsx] useMemo resultado filteredAndSortedFamilies:", JSON.stringify(sorted));
    return sorted;
  }, [filteredFamilies, sortConfig]);

  // DEBUG: Renderizar directamente desde el estado 'families' para probar - REVERTIDO
  // const familiesToRender = Array.isArray(families) ? families : [];


  // Abrir diálogo para nueva familia
  const handleOpenNewFamilyDialog = () => {
    // Asegurarse que tenemos un tarifaId antes de abrir
    if (!tarifaId) {
        toast.error("No se puede crear una familia sin una tarifa asociada.");
        return;
    }
    setIsNewFamily(true)
    setCurrentFamily({
      name: "",
      code: "",
      parentId: null,
      isActive: true,
      // Usar tarifaId dinámico
      tarifaId: tarifaId
    })
    setIsEditDialogOpen(true)
  }

  // Abrir diálogo para editar familia (restaurado)
  const handleEditFamily = (family: any) => {
    setIsNewFamily(false)
    // Mapear desde la estructura recibida (nombre, sin code/parentId) a la del estado (name, code, parentId)
    setCurrentFamily({
      id: family.id,
      name: family.nombre || "", // Usar nombre
      code: family.code || "", // Usar code o string vacío
      parentId: family.parentId || null, // Usar parentId o null
      isActive: family.isActive,
      tarifaId: family.tarifaId // Este ya venía del objeto family
    })
    setIsEditDialogOpen(true)
  }

  // Guardar familia (nueva o editada) - restaurado y validado
  const handleSaveFamily = () => {
    // Añadir validación más completa
    if (!currentFamily.name || !currentFamily.code || !currentFamily.tarifaId) {
        toast.error("Faltan datos obligatorios (nombre, código o tarifa).");
        return;
    }
    
    setIsSaving(true)
    setTimeout(() => {
      // currentFamily ya tiene el tarifaId correcto
      if (isNewFamily) {
        addFamiliaTarifa(currentFamily)
      } else if (currentFamily.id) {
        updateFamiliaTarifa(currentFamily.id, currentFamily)
      }
      setIsSaving(false)
      setIsEditDialogOpen(false)
    }, 500)
  }

  // Cambiar estado activo/inactivo (restaurado)
  const handleToggleStatus = (id: string) => {
    toggleFamiliaStatus(id)
  }

  // Confirmar eliminación de familia (restaurado)
  const handleConfirmDelete = (id: string) => {
    setFamilyToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  // Eliminar familia (restaurado)
  const handleDeleteFamily = () => {
    if (familyToDelete) {
      updateFamiliaTarifa(familyToDelete, { isActive: false })
      setIsDeleteConfirmOpen(false)
      setFamilyToDelete(null)
    }
  }

  return (
    <div className="px-6 pt-20 pb-20">
       {/* ... (JSX - Título, filtros, tabla - restaurado) ... */}
       <h1 className="mb-6 text-2xl font-bold">Gestión de Familias</h1>
      
      {/* Filtros */}
      <div className="flex flex-col mb-6 space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
         {/* ... (Input búsqueda) ... */}
         <div className="relative flex-1">
           <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
             <Search className="w-5 h-5 text-gray-400" />
           </div>
           <Input type="text" placeholder="Buscar familias..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
         </div>
         {/* ... (Checkbox ver deshabilitadas) ... */}
         <div className="flex items-center space-x-2">
           <Checkbox id="verFamiliasDeshabilitadas" checked={showDisabled} onCheckedChange={(checked) => setShowDisabled(!!checked)} />
           <label htmlFor="verFamiliasDeshabilitadas" className="text-sm">Ver familias deshabilitadas</label>
         </div>
      </div>

      {/* Tabla de familias */}
      <div className="mb-8 overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
           <thead className="table-header">
             {/* ... (Cabeceras de tabla restauradas) ... */}
             <tr>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase"><div className="flex items-center cursor-pointer" onClick={() => requestSort('code')}>Código {getSortIcon('code')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase"><div className="flex items-center cursor-pointer" onClick={() => requestSort('name')}>Nombre {getSortIcon('name')}</div></th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">Familia Padre</th>
              <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left uppercase">Acciones</th>
             </tr>
           </thead>
           <tbody className="bg-white divide-y divide-gray-200">
             {/* ... (Renderizado de filas restaurado) ... */}
             {/* DEBUG: Usar filteredAndSortedFamilies de nuevo - REVERTIDO */}
             {filteredAndSortedFamilies.map((family) => {
                // Quitar console.log de debug
                // console.log("[familias/page.tsx] DEBUG Renderizando fila para familia:", JSON.stringify(family));
                return (
                  <tr key={family.id} className="table-row-hover">
                    {/* Mostrar code o 'N/A' si no existe */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{family.code || 'N/A'}</td>
                    {/* Mostrar nombre */}
                    <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{family.nombre}{!family.isActive && (<span className="inline-flex px-2 ml-2 text-xs font-semibold leading-5 text-yellow-800 bg-yellow-100 rounded-full">Deshabilitada</span>)}</td>
                    {/* Usar nombre para buscar el padre */}
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{family.parentId ? (families.find(f => f.id === family.parentId)?.nombre || "(Desconocido)") : (<span className="text-gray-400">(Ninguna)</span>)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap"><div className="flex space-x-2"><Button variant="ghost" size="icon" onClick={() => handleEditFamily(family)} className="w-8 h-8 p-0"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleConfirmDelete(family.id)} className="w-8 h-8 p-0 text-red-600 hover:text-red-900 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></div></td>
                  </tr>
                );
              })}
             {/* DEBUG: Usar filteredAndSortedFamilies para la comprobación de vacío - REVERTIDO */}
             {filteredAndSortedFamilies.length === 0 && (<tr><td colSpan={4} className="px-6 py-4 text-sm text-center text-gray-500">No se encontraron familias</td></tr>)}
           </tbody>
        </table>
      </div>

      {/* Botones de acción fijos */} 
      <div className="fixed flex space-x-2 bottom-6 right-6">
        <Button 
          variant="outline" 
          // Usar tarifaId dinámico para volver
          onClick={() => router.push(`/configuracion/tarifas/${tarifaId}`)}
          disabled={!tarifaId} // Deshabilitar si no hay tarifaId
        >
          Volver
        </Button>
        <Button 
           variant="default" 
           className="bg-purple-800 hover:bg-purple-900" 
           onClick={handleOpenNewFamilyDialog}
           disabled={!tarifaId} // Deshabilitar si no hay tarifaId
         >
          Nueva familia
        </Button>
        {/* <Button variant="outline" className="text-white bg-black hover:bg-gray-800">Ayuda</Button> */}
      </div>

      {/* Modal de edición/creación de familia (restaurado) */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="sm:max-w-md">
           {/* ... (Contenido del modal restaurado) ... */}
           <DialogHeader><DialogTitle>{isNewFamily ? "Nueva familia" : "Editar familia"}</DialogTitle></DialogHeader>
           <div className="p-4 space-y-4">
             <div className="space-y-2"><label htmlFor="code" className="block text-sm font-medium text-gray-700">Código</label><Input id="code" className="focus:ring-purple-500 focus:border-purple-500" value={currentFamily.code} onChange={(e) => setCurrentFamily({ ...currentFamily, code: e.target.value })} placeholder="Código único"/></div>
             <div className="space-y-2"><label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label><Input id="name" className="focus:ring-purple-500 focus:border-purple-500" value={currentFamily.name} onChange={(e) => setCurrentFamily({ ...currentFamily, name: e.target.value })} placeholder="Nombre de la familia"/></div>
             {/* Usar family.nombre en las opciones del Select */}
             <div className="space-y-2"><label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Familia padre (opcional)</label><Select value={currentFamily.parentId || "none"} onValueChange={(value) => setCurrentFamily({ ...currentFamily, parentId: value === "none" ? null : value })}><SelectTrigger className="focus:ring-purple-500 focus:border-purple-500"><SelectValue placeholder="Seleccionar familia padre" /></SelectTrigger><SelectContent><SelectItem value="none">Ninguna</SelectItem>{families.filter(f => f.id !== currentFamily.id).map((family) => (<SelectItem key={family.id} value={family.id}>{family.nombre}</SelectItem>))}</SelectContent></Select></div>
             <div className="flex items-center space-x-2"><Checkbox id="isActive" checked={currentFamily.isActive} onCheckedChange={(checked) => setCurrentFamily({ ...currentFamily, isActive: !!checked })} className="data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"/><label htmlFor="isActive" className="text-sm font-medium text-gray-700">Activa</label></div>
           </div>
           <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button variant="default" className="bg-purple-700 hover:bg-purple-800" onClick={handleSaveFamily} disabled={isSaving || !currentFamily.name || !currentFamily.code}>{isSaving ? "Guardando..." : "Guardar"}</Button></DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Diálogo de confirmación para eliminar (restaurado) */}
       <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
         <DialogContent className="sm:max-w-md">
           {/* ... (Contenido del diálogo restaurado) ... */}
           <DialogHeader><DialogTitle>Confirmar eliminación</DialogTitle></DialogHeader>
           <div className="p-4"><p className="text-sm text-gray-500">¿Estás seguro de que deseas eliminar esta familia? Esta acción no se puede deshacer.</p></div>
           <DialogFooter><Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteFamily}>Eliminar</Button></DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  )
} 