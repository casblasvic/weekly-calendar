/**
 * Formulario de Asientos Contables Manuales
 * 
 * Permite crear asientos contables directamente con:
 * - Múltiples líneas debe/haber
 * - Validación de cuadre
 * - Selección de cuentas contables
 * - Descripción por línea
 */

import React, { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Save,
  Calculator,
  AlertCircle,
  CheckCircle,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useFiscalYearValidation } from '@/hooks/useFiscalYearValidation';

interface ManualJournalEntryFormProps {
  systemId: string;
  legalEntityId: string;
  onSuccess?: () => void;
  currentLanguage?: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface ChartAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: string;
  allowsDirectEntry: boolean;
}

export default function ManualJournalEntryForm({
  systemId,
  legalEntityId,
  onSuccess,
  currentLanguage = 'es'
}: ManualJournalEntryFormProps) {
  const queryClient = useQueryClient();
  
  // Estados del formulario
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
    { id: '2', accountId: '', description: '', debit: 0, credit: 0 }
  ]);

  // Validación de ejercicio fiscal
  const { validateWithToast, getFiscalYearBounds, hasActiveFiscalYear } = 
    useFiscalYearValidation(legalEntityId);

  const fiscalBounds = getFiscalYearBounds();

  // Cargar cuentas contables
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['chart-accounts-manual-entry', legalEntityId],
    queryFn: async () => {
      const response = await fetch(
        `/api/chart-of-accounts?legalEntityId=${legalEntityId}&isActive=true&allowsDirectEntry=true`
      );
      if (!response.ok) throw new Error('Error cargando cuentas');
      return response.json() as Promise<ChartAccount[]>;
    }
  });

  // Calcular totales
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;

  // Guardar asiento
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validar fecha
      if (!validateWithToast(entryDate)) {
        throw new Error('Fecha fuera del ejercicio fiscal');
      }

      // Validar cuadre
      if (!isBalanced) {
        throw new Error('El asiento debe estar cuadrado');
      }

      // Validar líneas
      const validLines = lines.filter(line => 
        line.accountId && (line.debit > 0 || line.credit > 0)
      );

      if (validLines.length < 2) {
        throw new Error('Se requieren al menos 2 líneas válidas');
      }

      // Crear asiento
      const response = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(entryDate),
          description,
          reference,
          legalEntityId,
          systemId,
          lines: validLines.map((line, index) => ({
            accountId: line.accountId,
            description: line.description || description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            order: index
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear asiento');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Asiento contable creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      
      // Limpiar formulario
      setDescription('');
      setReference('');
      setLines([
        { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
        { id: '2', accountId: '', description: '', debit: 0, credit: 0 }
      ]);
      
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Agregar línea
  const addLine = () => {
    setLines([...lines, {
      id: Date.now().toString(),
      accountId: '',
      description: '',
      debit: 0,
      credit: 0
    }]);
  };

  // Eliminar línea
  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter(line => line.id !== id));
    }
  };

  // Actualizar línea
  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        const updatedLine = { ...line, [field]: value };
        
        // Si se actualiza debe, limpiar haber y viceversa
        if (field === 'debit' && value > 0) {
          updatedLine.credit = 0;
        } else if (field === 'credit' && value > 0) {
          updatedLine.debit = 0;
        }
        
        return updatedLine;
      }
      return line;
    }));
  };

  // Auto-cuadrar la última línea
  const autoBalance = () => {
    if (lines.length < 2) return;

    const lastLine = lines[lines.length - 1];
    const otherLines = lines.slice(0, -1);
    
    const otherDebit = otherLines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const otherCredit = otherLines.reduce((sum, line) => sum + (line.credit || 0), 0);
    
    if (otherDebit > otherCredit) {
      updateLine(lastLine.id, 'credit', otherDebit - otherCredit);
      updateLine(lastLine.id, 'debit', 0);
    } else if (otherCredit > otherDebit) {
      updateLine(lastLine.id, 'debit', otherCredit - otherDebit);
      updateLine(lastLine.id, 'credit', 0);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-ES' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (!hasActiveFiscalYear) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay ejercicio fiscal activo. Configure uno en Ejercicios Fiscales.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Nuevo Asiento Manual
        </CardTitle>
        <CardDescription>
          Crea un asiento contable manualmente con múltiples líneas
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha
            </Label>
            <Input
              id="date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              min={fiscalBounds?.min}
              max={fiscalBounds?.max}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Nº documento, factura..."
            />
          </div>

          <div className="flex items-end">
            <Badge 
              className={isBalanced ? 'bg-green-500' : 'bg-red-500'}
              variant={isBalanced ? 'default' : 'destructive'}
            >
              {isBalanced ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Cuadrado
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Diferencia: {formatCurrency(difference)}
                </>
              )}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción General</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del asiento..."
            className="resize-none"
            rows={2}
          />
        </div>

        {/* Líneas del asiento */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Líneas del Asiento</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={autoBalance}
                disabled={isBalanced || lines.length < 2}
              >
                <Calculator className="h-4 w-4 mr-1" />
                Auto-cuadrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addLine}
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir línea
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right w-[120px]">Debe</TableHead>
                  <TableHead className="text-right w-[120px]">Haber</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select
                        value={line.accountId}
                        onValueChange={(value) => updateLine(line.id, 'accountId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountNumber} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Descripción línea..."
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                        className="text-right"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                        className="text-right"
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>Totales</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalDebit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalCredit)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setDescription('');
            setReference('');
            setLines([
              { id: '1', accountId: '', description: '', debit: 0, credit: 0 },
              { id: '2', accountId: '', description: '', debit: 0, credit: 0 }
            ]);
          }}
        >
          Limpiar
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!isBalanced || saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Guardando...' : 'Guardar Asiento'}
        </Button>
      </CardFooter>
    </Card>
  );
} 