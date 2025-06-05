/**
 * Gestor de Ejercicios Fiscales
 * 
 * Permite crear, editar y gestionar los ejercicios fiscales de la entidad legal
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { FiscalYearStatus } from '@prisma/client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Importar el visor de asientos
import dynamic from 'next/dynamic';
const JournalEntryViewer = dynamic(
  () => import('@/components/accounting/journal-entries/JournalEntryViewer'),
  { ssr: false }
);

interface FiscalYearManagerProps {
  systemId: string;
  legalEntityId: string;
}

interface FiscalYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: FiscalYearStatus;
  legalEntityId: string;
  systemId: string;
  createdAt: Date;
  updatedAt: Date;
}

const FISCAL_YEAR_STATUS_LABELS: Record<FiscalYearStatus, string> = {
  OPEN: 'Abierto',
  CLOSING_PROCESS: 'En proceso de cierre',
  CLOSED: 'Cerrado'
};

const FISCAL_YEAR_STATUS_COLORS: Record<FiscalYearStatus, string> = {
  OPEN: 'bg-green-500',
  CLOSING_PROCESS: 'bg-yellow-500',
  CLOSED: 'bg-gray-500'
};

export default function FiscalYearManager({
  systemId,
  legalEntityId
}: FiscalYearManagerProps) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFiscalYear, setEditingFiscalYear] = useState<FiscalYear | null>(null);
  const [selectedFiscalYearForJournal, setSelectedFiscalYearForJournal] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FiscalYearStatus | 'ALL'>('ALL');
  
  // Estados del formulario
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cargar ejercicios fiscales
  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years', legalEntityId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        legalEntityId,
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      });
      const response = await fetch(`/api/fiscal-years?${params}`);
      if (!response.ok) throw new Error('Error cargando ejercicios fiscales');
      return response.json() as Promise<FiscalYear[]>;
    }
  });

  // Crear o actualizar ejercicio fiscal
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FiscalYear>) => {
      const url = editingFiscalYear 
        ? `/api/fiscal-years/${editingFiscalYear.id}`
        : '/api/fiscal-years';
      
      const response = await fetch(url, {
        method: editingFiscalYear ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          legalEntityId,
          systemId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error guardando ejercicio fiscal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success(editingFiscalYear ? 'Ejercicio fiscal actualizado' : 'Ejercicio fiscal creado');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Eliminar ejercicio fiscal
  const deleteMutation = useMutation({
    mutationFn: async (fiscalYearId: string) => {
      const response = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legalEntityId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error eliminando ejercicio fiscal');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Ejercicio fiscal eliminado correctamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Cambiar estado del ejercicio fiscal
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FiscalYearStatus }) => {
      const response = await fetch(`/api/fiscal-years/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error cambiando estado');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Estado actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleOpenModal = (fiscalYear?: FiscalYear) => {
    if (fiscalYear) {
      setEditingFiscalYear(fiscalYear);
      setName(fiscalYear.name);
      setStartDate(format(new Date(fiscalYear.startDate), 'yyyy-MM-dd'));
      setEndDate(format(new Date(fiscalYear.endDate), 'yyyy-MM-dd'));
    } else {
      setEditingFiscalYear(null);
      // Valores por defecto para nuevo ejercicio
      const currentYear = new Date().getFullYear();
      setName(`Ejercicio ${currentYear}`);
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    }
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingFiscalYear(null);
  };

  const handleSubmit = () => {
    if (!name || !startDate || !endDate) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (start >= end) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    saveMutation.mutate({
      name,
      startDate: start,
      endDate: end,
      status: 'OPEN'
    });
  };

  const handleStatusChange = (fiscalYear: FiscalYear, newStatus: FiscalYearStatus) => {
    changeStatusMutation.mutate({
      id: fiscalYear.id,
      status: newStatus
    });
  };

  const handleDeleteFiscalYear = async (fiscalYear: FiscalYear) => {
    if (fiscalYear.status !== 'OPEN') {
      toast.error('Solo se pueden eliminar ejercicios fiscales abiertos');
      return;
    }

    const confirmMessage = `¿Está seguro de eliminar el ejercicio fiscal "${fiscalYear.name}"?\n\nEsta acción solo es posible si el ejercicio no tiene movimientos contables asociados.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    deleteMutation.mutate(fiscalYear.id);
  };

  const getStatusIcon = (status: FiscalYearStatus) => {
    switch (status) {
      case 'OPEN':
        return <PlayCircle className="h-4 w-4" />;
      case 'CLOSING_PROCESS':
        return <AlertCircle className="h-4 w-4" />;
      case 'CLOSED':
        return <Lock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ejercicios Fiscales
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-4 items-center">
              <Label>Filtrar por estado:</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FiscalYearStatus | 'ALL')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="OPEN">Abiertos</SelectItem>
                  <SelectItem value="CLOSING_PROCESS">En cierre</SelectItem>
                  <SelectItem value="CLOSED">Cerrados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ejercicio
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Gestiona los períodos contables de tu empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Cargando ejercicios fiscales...</div>
        ) : fiscalYears && fiscalYears.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fiscalYears.map((fiscalYear) => (
                <TableRow key={fiscalYear.id}>
                  <TableCell className="font-medium">{fiscalYear.name}</TableCell>
                  <TableCell>
                    {format(new Date(fiscalYear.startDate), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(fiscalYear.endDate), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn('gap-1', FISCAL_YEAR_STATUS_COLORS[fiscalYear.status])}
                    >
                      {getStatusIcon(fiscalYear.status)}
                      {FISCAL_YEAR_STATUS_LABELS[fiscalYear.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(fiscalYear)}
                        disabled={fiscalYear.status === 'CLOSED'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFiscalYearForJournal(fiscalYear.id)}
                        title="Ver asientos contables"
                      >
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(fiscalYear, 'CLOSING_PROCESS')}
                      >
                        Iniciar Cierre
                      </Button>
                      {fiscalYear.status === 'CLOSING_PROCESS' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(fiscalYear, 'OPEN')}
                          >
                            Reabrir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(fiscalYear, 'CLOSED')}
                          >
                            Cerrar
                          </Button>
                        </>
                      )}
                      {fiscalYear.status === 'OPEN' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFiscalYear(fiscalYear)}
                          className="text-destructive hover:text-destructive"
                          title="Eliminar ejercicio fiscal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay ejercicios fiscales configurados. Crea uno nuevo para empezar.
          </div>
        )}
      </CardContent>

      {/* Modal de creación/edición */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFiscalYear ? 'Editar Ejercicio Fiscal' : 'Nuevo Ejercicio Fiscal'}
            </DialogTitle>
            <DialogDescription>
              Define el período contable para tu empresa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Ejercicio</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Ejercicio 2024"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>

            {editingFiscalYear && editingFiscalYear.status !== 'OPEN' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Solo se pueden editar ejercicios fiscales abiertos.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saveMutation.isPending || (editingFiscalYear && editingFiscalYear.status !== 'OPEN')}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visor de asientos contables */}
      {selectedFiscalYearForJournal && (
        <Dialog 
          open={!!selectedFiscalYearForJournal} 
          onOpenChange={() => setSelectedFiscalYearForJournal(null)}
        >
          <DialogContent className="max-w-7xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>Asientos Contables del Ejercicio</DialogTitle>
              <DialogDescription>
                {fiscalYears?.find(fy => fy.id === selectedFiscalYearForJournal)?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <JournalEntryViewer
                systemId={systemId}
                legalEntityId={legalEntityId}
                fiscalYearId={selectedFiscalYearForJournal}
                currentLanguage="es"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
} 