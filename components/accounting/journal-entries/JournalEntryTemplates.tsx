/**
 * Gestor de Plantillas de Asientos Contables
 * 
 * Permite guardar asientos frecuentes como plantillas para reutilizar
 * - Crear plantillas desde asientos existentes
 * - Editar y eliminar plantillas
 * - Aplicar plantillas para crear nuevos asientos
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Save,
  Edit,
  Trash2,
  Copy,
  Search,
  Plus,
  Info,
  Star,
  StarOff
} from 'lucide-react';
import { toast } from 'sonner';

interface JournalEntryTemplatesProps {
  systemId: string;
  legalEntityId: string;
  onUseTemplate?: (template: JournalTemplate) => void;
  currentLanguage?: string;
}

interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  lines: TemplateLine[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateLine {
  accountId: string;
  accountNumber?: string;
  accountName?: string;
  description: string;
  debitFormula: string; // Puede ser un número o una fórmula como "{amount}"
  creditFormula: string;
}

// Simulación de datos hasta que se cree la tabla en la BD
const mockTemplates: JournalTemplate[] = [
  {
    id: '1',
    name: 'Nómina mensual',
    description: 'Asiento de nómina con retenciones',
    isFavorite: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    lines: [
      {
        accountId: '1',
        accountNumber: '640',
        accountName: 'Sueldos y salarios',
        description: 'Sueldos brutos',
        debitFormula: '{gross_salary}',
        creditFormula: '0'
      },
      {
        accountId: '2',
        accountNumber: '476',
        accountName: 'SS a cargo empresa',
        description: 'Seguridad social empresa',
        debitFormula: '{ss_company}',
        creditFormula: '0'
      },
      {
        accountId: '3',
        accountNumber: '475',
        accountName: 'HP acreedora',
        description: 'Retención IRPF',
        debitFormula: '0',
        creditFormula: '{irpf}'
      },
      {
        accountId: '4',
        accountNumber: '476',
        accountName: 'SS acreedora',
        description: 'SS trabajador + empresa',
        debitFormula: '0',
        creditFormula: '{ss_total}'
      },
      {
        accountId: '5',
        accountNumber: '465',
        accountName: 'Remuneraciones pendientes',
        description: 'Neto a pagar',
        debitFormula: '0',
        creditFormula: '{net_salary}'
      }
    ]
  },
  {
    id: '2',
    name: 'Compra con IVA',
    description: 'Compra de mercancías con IVA',
    isFavorite: false,
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
    lines: [
      {
        accountId: '6',
        accountNumber: '600',
        accountName: 'Compras',
        description: 'Compra mercancías',
        debitFormula: '{base}',
        creditFormula: '0'
      },
      {
        accountId: '7',
        accountNumber: '472',
        accountName: 'IVA soportado',
        description: 'IVA 21%',
        debitFormula: '{base} * 0.21',
        creditFormula: '0'
      },
      {
        accountId: '8',
        accountNumber: '400',
        accountName: 'Proveedores',
        description: 'Total factura',
        debitFormula: '0',
        creditFormula: '{base} * 1.21'
      }
    ]
  }
];

export default function JournalEntryTemplates({
  systemId,
  legalEntityId,
  onUseTemplate,
  currentLanguage = 'es'
}: JournalEntryTemplatesProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JournalTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<JournalTemplate | null>(null);

  // Estados del formulario
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Por ahora usar datos mock, en producción esto vendría de la API
  const templates = mockTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setIsCreateModalOpen(true);
  };

  const handleEditTemplate = (template: JournalTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setIsCreateModalOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (editingTemplate) {
      toast.success('Plantilla actualizada correctamente');
    } else {
      toast.success('Plantilla creada correctamente');
    }

    setIsCreateModalOpen(false);
  };

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      toast.success('Plantilla eliminada correctamente');
      setTemplateToDelete(null);
    }
  };

  const handleToggleFavorite = (template: JournalTemplate) => {
    toast.success(
      template.isFavorite 
        ? 'Plantilla eliminada de favoritos' 
        : 'Plantilla añadida a favoritos'
    );
  };

  const handleUseTemplate = (template: JournalTemplate) => {
    if (onUseTemplate) {
      onUseTemplate(template);
      toast.success('Plantilla aplicada. Complete los valores variables.');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(currentLanguage === 'es' ? 'es-ES' : 'en-US');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Plantillas de Asientos
            </div>
            <Button onClick={handleCreateTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </CardTitle>
          <CardDescription>
            Guarda y reutiliza asientos frecuentes como plantillas
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Lista de plantillas */}
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay plantillas disponibles
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{template.name}</h4>
                          {template.isFavorite && (
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Creada: {formatDate(template.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleFavorite(template)}
                          title={template.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        >
                          {template.isFavorite ? (
                            <StarOff className="h-4 w-4" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTemplateToDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Líneas del asiento:</div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Debe</TableHead>
                            <TableHead className="text-right">Haber</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {template.lines.map((line, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {line.accountNumber} - {line.accountName}
                              </TableCell>
                              <TableCell className="text-sm">
                                {line.description}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {line.debitFormula !== '0' && (
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {line.debitFormula}
                                  </code>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {line.creditFormula !== '0' && (
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {line.creditFormula}
                                  </code>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      {/* Variables de la plantilla */}
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Variables disponibles: {
                            Array.from(new Set(
                              template.lines.flatMap(line => [
                                ...line.debitFormula.match(/\{(\w+)\}/g) || [],
                                ...line.creditFormula.match(/\{(\w+)\}/g) || []
                              ])
                            )).join(', ')
                          }
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Usar esta plantilla
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de creación/edición */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Modifica los detalles de la plantilla'
                : 'Para crear una plantilla, primero crea un asiento manual y luego guárdalo como plantilla'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Nombre</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ej: Nómina mensual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">Descripción</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe para qué se usa esta plantilla..."
                rows={3}
              />
            </div>

            {!editingTemplate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para crear una plantilla con líneas, primero crea un asiento manual
                  y usa la opción "Guardar como plantilla" desde el visor de asientos.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              {editingTemplate ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla
              "{templateToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 