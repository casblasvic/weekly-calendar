"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CheckCircle } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { VATType } from "@prisma/client"; // Importar tipo VATType
import VATTypeFormModal from "@/components/vat-type-form-modal"; // Importaremos el modal (siguiente paso)

export default function GestionIVA() {
  const [vatTypes, setVatTypes] = useState<VATType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVatType, setEditingVatType] = useState<VATType | null>(null);

  // Cargar Tipos de IVA
  const fetchVatTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vat-types");
      if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener tipos de IVA`);
      }
      const data: VATType[] = await response.json();
      setVatTypes(data);
    } catch (err) {
      console.error("Error fetching VAT types:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setVatTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVatTypes();
  }, [fetchVatTypes]);

  // --- Handlers ---
  const handleNuevoTipoIVA = () => {
    setEditingVatType(null);
    setIsModalOpen(true);
  };

  const handleEditarTipoIVA = (vatType: VATType) => {
    setEditingVatType(vatType);
    setIsModalOpen(true);
  };

  const handleEliminarTipoIVA = async (vatTypeId: string, vatTypeName: string) => {
     if (!window.confirm(`¿Está seguro de que desea eliminar el tipo de IVA "${vatTypeName}"?\nEsto podría afectar a servicios, productos o tarifas que lo usen.`)) {
       return;
     }
     try {
       const response = await fetch(`/api/vat-types/${vatTypeId}`, {
         method: 'DELETE',
       });
       if (!response.ok) {
         let errorMsg = `Error ${response.status}`; 
         try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (parseError) {}
         throw new Error(errorMsg);
       }
       sonnerToast.success(`Tipo de IVA "${vatTypeName}" eliminado.`);
       fetchVatTypes(); // Recargar
     } catch (error) {
       console.error("Error deleting VAT type:", error);
       sonnerToast.error(`Error al eliminar "${vatTypeName}": ${error instanceof Error ? error.message : 'Error desconocido'}`);
     }
  };

  // --- Renderizado ---
  const renderSkeleton = () => (
     Array.from({ length: 3 }).map((_, index) => (
      <TableRow key={`skel-iva-${index}`}>
        <TableCell><Skeleton className="h-5 w-full" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end space-x-2">
            <Skeleton className="w-8 h-8 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-md" />
          </div>
        </TableCell>
      </TableRow>
    ))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestión de Tipos de IVA</h1>
        <Button onClick={handleNuevoTipoIVA}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tipo IVA
        </Button>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
          Error al cargar tipos de IVA: {error}
        </div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tasa (%)</TableHead>
              <TableHead>Por Defecto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton()
            ) : vatTypes.length > 0 ? (
              vatTypes.map((vatType) => (
                <TableRow key={vatType.id}>
                  <TableCell className="font-medium">{vatType.name}</TableCell>
                  <TableCell>{vatType.rate.toFixed(2)}%</TableCell>
                  <TableCell>{vatType.isDefault ? <CheckCircle className="text-green-600" size={18}/> : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditarTipoIVA(vatType)} className="text-blue-600 hover:text-blue-800">
                        <Pencil size={16} />
                      </Button>
                      {/* Opcional: Prevenir borrar si isDefault o está en uso? */} 
                      <Button variant="ghost" size="icon" onClick={() => handleEliminarTipoIVA(vatType.id, vatType.name)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No se encontraron tipos de IVA.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal para crear/editar tipos de IVA (siguiente paso) */}
       <VATTypeFormModal 
           isOpen={isModalOpen} 
           setIsOpen={setIsModalOpen} 
           vatType={editingVatType} 
           onSave={() => { fetchVatTypes(); }} 
       /> 

    </div>
  );
} 