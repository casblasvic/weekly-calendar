import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BaseFile } from '@/contexts/file-context';
import { AlertTriangle, Link, FileIcon, File, Trash2, ExternalLink, Wrench, ShoppingCart, Users, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: BaseFile | null;
  isDuplicate: boolean;
  onConfirm: () => void;
  getEntityName: (type: string, id: string) => string;
  relatedEntities?: { type: string, id: string }[];
}

// Función para obtener el icono según el tipo de entidad
const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'equipment':
      return <Wrench className="h-3 w-3 text-blue-600" />;
    case 'service':
      return <ShoppingCart className="h-3 w-3 text-purple-600" />;
    case 'client':
      return <Users className="h-3 w-3 text-green-600" />;
    case 'tarifa':
      return <Receipt className="h-3 w-3 text-amber-600" />;
    default:
      return <FileIcon className="h-3 w-3 text-gray-600" />;
  }
};

export const FileDeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onOpenChange,
  file,
  isDuplicate,
  onConfirm,
  getEntityName,
  relatedEntities = []
}) => {
  if (!file) return null;
  
  const entityName = file.entityType && file.entityId 
    ? getEntityName(file.entityType, file.entityId)
    : 'desconocida';
    
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-center gap-2 mb-4">
          {isDuplicate ? 
            <AlertTriangle className="h-6 w-6 text-amber-500" /> : 
            <Trash2 className="h-6 w-6 text-red-500" />
          }
          <h3 className="text-lg font-semibold text-red-600">
            {isDuplicate ? "Eliminar referencia de archivo" : "Confirmar eliminación de archivo"}
          </h3>
        </div>
        
        <div className="flex items-center p-3 bg-gray-50 rounded-md border mb-4">
          <div className="mr-3">
            <File className="h-8 w-8 text-blue-500" />
          </div>
          <div>
            <p className="font-medium">{file.fileName}</p>
            <p className="text-xs text-gray-500">
              {(file.fileSize / 1024).toFixed(1)} KB • {file.mimeType}
            </p>
          </div>
        </div>
        
        {isDuplicate ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Este archivo está asociado a múltiples entidades.
              Solo se eliminará la referencia de la entidad:
            </p>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 pl-1 pr-2">
                <span className="flex items-center gap-1">
                  {getEntityIcon(file.entityType)}
                  {entityName}
                </span>
              </Badge>
              
              <span className="text-xs text-gray-500">
                ({file.entityType})
              </span>
            </div>
            
            {relatedEntities && relatedEntities.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-2">
                  El archivo seguirá disponible en {relatedEntities.length} {relatedEntities.length === 1 ? 'ubicación' : 'ubicaciones'}:
                </p>
                
                <ScrollArea className="h-[120px] rounded-md border bg-gray-50 p-2">
                  <div className="space-y-2">
                    {relatedEntities.map((entity, index) => (
                      <div key={`${entity.type}-${entity.id}`} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                          {getEntityIcon(entity.type)}
                        </div>
                        <span className="text-gray-800">
                          {getEntityName(entity.type, entity.id)}
                        </span>
                        <span className="text-gray-500">
                          ({entity.type})
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md mt-4 flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>El archivo seguirá disponible para otras entidades que lo utilizan. Solo se eliminará la asociación con esta entidad.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Esta acción eliminará permanentemente el archivo
              <span className="font-semibold"> {file.fileName}</span> asociado a la entidad:
            </p>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 pl-1 pr-2">
                <span className="flex items-center gap-1">
                  {getEntityIcon(file.entityType)}
                  {entityName}
                </span>
              </Badge>
              
              <span className="text-xs text-gray-500">
                ({file.entityType})
              </span>
            </div>
          </div>
        )}
        
        <p className="text-sm font-semibold mt-4 p-2 border border-red-200 bg-red-50 text-red-600 rounded-md flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Esta acción no se puede deshacer.
        </p>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            {isDuplicate ? "Eliminar referencia" : "Eliminar archivo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileDeleteDialog; 