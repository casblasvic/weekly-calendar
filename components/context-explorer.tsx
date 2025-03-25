"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Search, FileCode, Edit, Download, Eye, Save, X, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// Lista completa de contextos basada en los archivos encontrados
const CONTEXT_FILES = [
  { name: "DatabaseContext", file: "database-context.tsx", description: "Gestión de conexión y esquema de DB" },
  { name: "ClientContext", file: "client-context.tsx", description: "Gestión de clientes" },
  { name: "ClinicContext", file: "clinic-context.tsx", description: "Gestión de clínicas" },
  { name: "ServiciosContext", file: "servicios-context.tsx", description: "Gestión de servicios" },
  { name: "ScheduleTemplatesContext", file: "schedule-templates-context.tsx", description: "Plantillas horarias" },
  { name: "StorageContext", file: "storage-context.tsx", description: "Almacenamiento de archivos" },
  { name: "FileContext", file: "file-context.tsx", description: "Gestión de archivos" },
  { name: "EquipmentContext", file: "equipment-context.tsx", description: "Gestión de equipamiento" },
  { name: "CabinContext", file: "CabinContext.tsx", description: "Gestión de cabinas" },
  { name: "ImageContext", file: "image-context.tsx", description: "Gestión de imágenes" },
  { name: "DocumentContext", file: "document-context.tsx", description: "Gestión de documentos" },
  { name: "InterfazContext", file: "interfaz-Context.tsx", description: "Gestión de interfaz" },
  { name: "TarifContext", file: "tarif-context.tsx", description: "Gestión de tarifas" },
  { name: "LastActiveClientContext", file: "last-active-client-context.tsx", description: "Cliente activo reciente" },
  { name: "LastClientContext", file: "last-client-context.tsx", description: "Último cliente" },
  { name: "ClientCardContext", file: "client-card-context.tsx", description: "Tarjeta de cliente" },
  { name: "FamilyContext", file: "family-context.tsx", description: "Gestión de familias" },
  { name: "IvaContext", file: "iva-context.tsx", description: "Gestión de IVA" },
  { name: "ThemeContext", file: "theme-context.tsx", description: "Gestión de temas" },
  { name: "SystemContext", file: "system/system-context.tsx", description: "Gestión del sistema" },
  { name: "ThemeContextNew", file: "theme/theme-context.tsx", description: "Nueva gestión de temas" },
  { name: "ConsumoServicioContext", file: "consumo-servicio-context.tsx", description: "Consumo de servicios" },
  { name: "ProductoContext", file: "producto-contexto.tsx", description: "Gestión de productos" },
  { name: "AuthContext", file: "auth-context.tsx", description: "Autenticación" }
];

export function ContextExplorer() {
  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  
  // Estados para la búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredContexts, setFilteredContexts] = useState(CONTEXT_FILES);
  
  // Estados para el diálogo de edición
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<typeof CONTEXT_FILES[0] | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Referencia al editor
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Calcular los contextos a mostrar en la página actual
  const getCurrentPageContexts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredContexts.slice(startIndex, endIndex);
  };
  
  // Efecto para actualizar el número total de páginas
  useEffect(() => {
    setTotalPages(Math.ceil(filteredContexts.length / itemsPerPage));
    setCurrentPage(1); // Resetear a la primera página cuando cambia el filtro
  }, [filteredContexts, itemsPerPage]);
  
  // Efecto para filtrar los contextos basados en el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContexts(CONTEXT_FILES);
      return;
    }
    
    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = CONTEXT_FILES.filter(context => 
      context.name.toLowerCase().includes(lowercaseSearch) || 
      context.description.toLowerCase().includes(lowercaseSearch) ||
      context.file.toLowerCase().includes(lowercaseSearch)
    );
    
    setFilteredContexts(filtered);
  }, [searchTerm]);
  
  // Función para cargar el contenido de un archivo
  const loadFileContent = async (filePath: string) => {
    setIsLoading(true);
    try {
      // Primero intentaremos cargar el archivo real
      try {
        // En un entorno de desarrollo, podemos intentar acceder a los archivos directamente
        const response = await fetch(`/api/read-file?path=${encodeURIComponent(filePath)}`);
        
        if (response.ok) {
          const data = await response.text();
          setFileContent(data);
          setIsEditing(false);
          return;
        }
      } catch (fetchError) {
        console.warn("No se pudo cargar el archivo directamente:", fetchError);
      }
      
      // Si no se puede cargar directamente, simulamos el contenido
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular latencia
      
      const fileName = filePath.split('/').pop() || '';
      const contextName = fileName.replace('.tsx', 'Context').replace('-context', 'Context');
      
      // Generar un placeholder basado en el nombre del archivo
      setFileContent(
`// Contenido simulado para: ${filePath}
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Interfaz para el contexto
interface ${contextName}Type {
  // Propiedades y métodos que iría aquí
  someProperty: string;
  someMethod: () => void;
}

// Crear el contexto
const ${contextName} = createContext<${contextName}Type | undefined>(undefined)

// Provider
export function ${contextName}Provider({ children }: { children: ReactNode }) {
  // Estados y lógica aquí
  const [someProperty, setSomeProperty] = useState<string>("valor inicial")
  
  const someMethod = () => {
    console.log("Método ejecutado");
    setSomeProperty("nuevo valor");
  }
  
  return (
    <${contextName}.Provider
      value={{
        someProperty,
        someMethod
      }}
    >
      {children}
    </${contextName}.Provider>
  )
}

// Hook para usar el contexto
export function use${contextName.replace('Context', '')}() {
  const context = useContext(${contextName})
  if (context === undefined) {
    throw new Error("use${contextName.replace('Context', '')} debe usarse dentro de ${contextName}Provider")
  }
  return context
}
`);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error al cargar el archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el contenido del archivo",
        variant: "destructive"
      });
      
      // Establecer un contenido de fallback
      setFileContent(`// No se pudo cargar el contenido de: ${filePath}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para guardar/descargar un archivo
  const downloadFile = () => {
    try {
      // Crear un blob con el contenido
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Crear un enlace de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedContext?.file || 'context-file.tsx';
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Descarga iniciada",
        description: `El archivo ${selectedContext?.file} se ha descargado correctamente.`
      });
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo",
        variant: "destructive"
      });
    }
  };
  
  // Función para guardar los cambios (simulado)
  const saveChanges = () => {
    // Esta función es simulada
    toast({
      title: "Cambios guardados",
      description: "Los cambios se han guardado correctamente (simulado)."
    });
    setIsEditing(false);
  };
  
  // Función para abrir el diálogo de visualización/edición
  const openFileDialog = (context: typeof CONTEXT_FILES[0]) => {
    setSelectedContext(context);
    loadFileContent(`contexts/${context.file}`);
    setIsDialogOpen(true);
  };
  
  // Renderizar controles de paginación
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={currentPage === i}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
              aria-disabled={currentPage === 1}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <span className="px-4">...</span>
                </PaginationItem>
              )}
            </>
          )}
          
          {pages}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <span className="px-4">...</span>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
              aria-disabled={currentPage === totalPages}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="search-contexts">Buscar contextos</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-contexts"
              placeholder="Buscar por nombre, descripción o archivo..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="w-full md:w-auto space-y-2">
          <Label htmlFor="items-per-page">Elementos por página</Label>
          <Select 
            value={String(itemsPerPage)} 
            onValueChange={(value) => setItemsPerPage(parseInt(value))}
          >
            <SelectTrigger id="items-per-page" className="w-full md:w-[120px]">
              <SelectValue placeholder="Elementos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="9">9</SelectItem>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Mostrando {Math.min(filteredContexts.length, getCurrentPageContexts().length)} de {filteredContexts.length} contextos
        </p>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getCurrentPageContexts().map((context) => (
            <div 
              key={context.file} 
              className="border rounded p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between">
                <h4 className="text-md font-bold flex items-center">
                  <FileCode className="h-4 w-4 mr-2" />
                  {context.name}
                </h4>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => openFileDialog(context)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{context.description}</p>
              <div className="text-xs text-gray-500 mt-2 font-mono">{context.file}</div>
            </div>
          ))}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          {renderPagination()}
        </div>
      )}
      
      {/* Diálogo para ver/editar el archivo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileCode className="h-5 w-5 mr-2" />
                {selectedContext?.file}
              </div>
              <div className="flex space-x-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        // Recargar el contenido original
                        if (selectedContext) {
                          loadFileContent(`contexts/${selectedContext.file}`);
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={saveChanges}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadFile}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-[400px] my-4 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!isEditing}
                spellCheck={false}
              />
            )}
          </div>
          
          <DialogFooter>
            <div className="text-xs text-gray-500">
              Nota: Los cambios realizados solo se guardarán localmente. Para cambios permanentes, 
              descarga el archivo y reemplázalo en el proyecto.
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 