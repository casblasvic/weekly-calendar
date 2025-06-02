/**
 * Configurador de Series Documentales
 * 
 * Permite configurar las series de numeración para diferentes tipos de documentos:
 * - Tickets
 * - Facturas
 * - Facturas rectificativas
 * - Etc.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Hash,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseDocumentType, ResetPolicy } from '@prisma/client';

interface DocumentSeriesConfiguratorProps {
  systemId: string;
  legalEntityId: string;
}

interface DocumentSeries {
  id: string;
  organizationId: string;
  legalEntityId: string;
  clinicId?: string;
  code: string;
  documentType: BaseDocumentType;
  prefix?: string;
  padding?: number;
  nextNumber: number;
  resetPolicy?: ResetPolicy;
  lastResetAt?: Date;
  fiscalYearId?: string;
  isActive: boolean;
  // Relaciones opcionales para display
  clinic?: { name: string };
  fiscalYear?: { name: string };
}

const DOCUMENT_TYPE_LABELS: Record<BaseDocumentType, string> = {
  TICKET: 'Ticket',
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Factura Rectificativa',
  DELIVERY_NOTE: 'Albarán',
  PURCHASE_ORDER: 'Orden de Compra',
  SALES_ORDER: 'Pedido de Venta',
  QUOTE: 'Presupuesto',
  PROFORMA_INVOICE: 'Factura Proforma'
};

const RESET_POLICY_LABELS: Record<ResetPolicy, string> = {
  NEVER: 'Nunca',
  YEARLY: 'Anual',
  MONTHLY: 'Mensual',
  FISCAL_YEAR: 'Ejercicio Fiscal'
};

export default function DocumentSeriesConfigurator({
  systemId,
  legalEntityId
}: DocumentSeriesConfiguratorProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<DocumentSeries | null>(null);
  
  // Estados del formulario
  const [code, setCode] = useState('');
  const [documentType, setDocumentType] = useState<BaseDocumentType>('TICKET');
  const [prefix, setPrefix] = useState('');
  const [padding, setPadding] = useState(8);
  const [nextNumber, setNextNumber] = useState(1);
  const [resetPolicy, setResetPolicy] = useState<ResetPolicy>('YEARLY');
  const [clinicId, setClinicId] = useState<string>('all');
  
  // Cargar clínicas disponibles para selección
  const { data: clinics } = useQuery({
    queryKey: ['clinics', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/clinics?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error cargando clínicas');
      return response.json();
    }
  });

  // Cargar series existentes
  const { data: series, isLoading } = useQuery({
    queryKey: ['document-series', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/document-series?legalEntityId=${legalEntityId}`
      );
      if (!response.ok) throw new Error('Error cargando series');
      return response.json() as Promise<DocumentSeries[]>;
    }
  });

  // Crear o actualizar serie
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DocumentSeries>) => {
      const url = editingSeries 
        ? `/api/document-series/${editingSeries.id}`
        : '/api/document-series';
      
      const response = await fetch(url, {
        method: editingSeries ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          legalEntityId,
          organizationId: systemId
        })
      });
      
      if (!response.ok) throw new Error('Error guardando serie');
      return response.json();
    },
    onSuccess: () => {
      toast.success(editingSeries ? 'Serie actualizada' : 'Serie creada');
      queryClient.invalidateQueries({ queryKey: ['document-series'] });
      handleCloseModal();
    },
    onError: () => {
      toast.error('Error al guardar la serie');
    }
  });

  // Eliminar serie
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/document-series/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error eliminando serie');
    },
    onSuccess: () => {
      toast.success('Serie eliminada');
      queryClient.invalidateQueries({ queryKey: ['document-series'] });
    },
    onError: () => {
      toast.error('Error al eliminar la serie');
    }
  });

  const handleOpenModal = (series?: DocumentSeries) => {
    if (series) {
      setEditingSeries(series);
      setCode(series.code);
      setDocumentType(series.documentType);
      setPrefix(series.prefix || '');
      setPadding(series.padding || 8);
      setNextNumber(series.nextNumber);
      setResetPolicy(series.resetPolicy || 'YEARLY');
      setClinicId(series.clinicId || 'all');
    } else {
      setEditingSeries(null);
      // Reset form
      setCode('');
      setPrefix('');
      setPadding(8);
      setNextNumber(1);
      setResetPolicy('YEARLY');
      setClinicId('all');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeries(null);
  };

  const handleSubmit = () => {
    if (!code) {
      toast.error('El código es obligatorio');
      return;
    }

    saveMutation.mutate({
      code,
      documentType,
      prefix: prefix || undefined,
      padding: padding,
      nextNumber: editingSeries?.nextNumber || nextNumber,
      resetPolicy,
      clinicId: clinicId === 'all' ? undefined : clinicId || undefined,
      isActive: true
    });
  };

  const formatExample = (series: DocumentSeries) => {
    const paddedNumber = String(series.nextNumber).padStart(series.padding || 8, '0');
    return `${series.prefix || ''}${paddedNumber}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Series Documentales
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Serie
          </Button>
        </CardTitle>
        <CardDescription>
          Configura las series de numeración para cada tipo de documento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando series...</div>
        ) : series && series.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Próximo Número</TableHead>
                <TableHead>Ejemplo</TableHead>
                <TableHead>Reseteo</TableHead>
                <TableHead>Clínica</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((serie) => (
                <TableRow key={serie.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {DOCUMENT_TYPE_LABELS[serie.documentType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {serie.code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      {serie.nextNumber}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatExample(serie)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {serie.resetPolicy ? RESET_POLICY_LABELS[serie.resetPolicy] : 'Sin reset'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {serie.clinic ? (
                      <span className="text-sm">{serie.clinic.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {serie.isActive ? (
                      <Badge className="bg-green-500">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(serie)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('¿Seguro que quieres eliminar esta serie?')) {
                            deleteMutation.mutate(serie.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay series configuradas. Crea una nueva serie para empezar.
          </div>
        )}
      </CardContent>

      {/* Modal de creación/edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSeries ? 'Editar Serie' : 'Nueva Serie Documental'}
            </DialogTitle>
            <DialogDescription>
              Configura la numeración para este tipo de documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de Serie *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: FCT-2024, TKT-MAIN"
                disabled={!!editingSeries}
              />
              <p className="text-xs text-muted-foreground">
                Código único para identificar esta serie
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as BaseDocumentType)}
                disabled={!!editingSeries}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefijo (Opcional)</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="Ej: FCT-"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="padding">Relleno con ceros</Label>
                <Input
                  id="padding"
                  type="number"
                  value={padding}
                  onChange={(e) => setPadding(parseInt(e.target.value) || 8)}
                  min={1}
                  max={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextNumber">Número Inicial</Label>
              <Input
                id="nextNumber"
                type="number"
                value={nextNumber}
                onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)}
                min={1}
                disabled={!!editingSeries}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicId">Clínica (Opcional)</Label>
              <Select
                value={clinicId}
                onValueChange={setClinicId}
              >
                <SelectTrigger id="clinicId">
                  <SelectValue placeholder="Aplicar a todas las clínicas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las clínicas</SelectItem>
                  {clinics?.map((clinic: any) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resetPolicy">Política de Reseteo</Label>
              <Select
                value={resetPolicy}
                onValueChange={(value) => setResetPolicy(value as ResetPolicy)}
              >
                <SelectTrigger id="resetPolicy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESET_POLICY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Ejemplo de numeración: {prefix}{String(nextNumber).padStart(padding, '0')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 