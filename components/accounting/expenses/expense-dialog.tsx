'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';

const formSchema = z.object({
  date: z.date({
    required_error: 'La fecha es requerida',
  }),
  typeId: z.string({
    required_error: 'El tipo de gasto es requerido',
  }),
  supplierId: z.string({
    required_error: 'El proveedor es requerido',
  }),
  invoiceNumber: z.string().optional(),
  description: z.string({
    required_error: 'La descripción es requerida',
  }),
  subtotal: z.number({
    required_error: 'El subtotal es requerido',
  }).positive('El subtotal debe ser mayor a 0'),
  taxAmount: z.number().min(0, 'El IVA no puede ser negativo'),
  totalAmount: z.number().positive('El total debe ser mayor a 0'),
  vatTypeId: z.string().optional(),
  clinicId: z.string({
    required_error: 'La clínica es requerida',
  }),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'CANCELLED']),
});

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
  onClose: () => void;
}

export function ExpenseDialog({ 
  open, 
  onOpenChange, 
  expense, 
  onClose 
}: ExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [vatTypes, setVatTypes] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      typeId: '',
      supplierId: '',
      invoiceNumber: '',
      description: '',
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
      vatTypeId: '',
      clinicId: '',
      status: 'PENDING',
    },
  });

  // Cargar datos auxiliares
  useEffect(() => {
    if (open) {
      // TODO: Cargar tipos de gasto, proveedores, tipos de IVA y clínicas
      // Por ahora usaremos datos de ejemplo
      setExpenseTypes([
        { id: '1', name: 'Material de oficina' },
        { id: '2', name: 'Servicios profesionales' },
        { id: '3', name: 'Alquiler' },
      ]);
      
      setSuppliers([
        { id: '1', name: 'Proveedor 1' },
        { id: '2', name: 'Proveedor 2' },
      ]);
      
      setVatTypes([
        { id: '1', name: 'IVA 21%', rate: 21 },
        { id: '2', name: 'IVA 10%', rate: 10 },
        { id: '3', name: 'IVA 4%', rate: 4 },
      ]);
      
      setClinics([
        { id: '1', name: 'Clínica Principal' },
        { id: '2', name: 'Sucursal Centro' },
      ]);
    }
  }, [open]);

  // Cargar datos del gasto si es edición
  useEffect(() => {
    if (expense) {
      form.reset({
        date: new Date(expense.date),
        typeId: expense.typeId,
        supplierId: expense.supplierId,
        invoiceNumber: expense.invoiceNumber || '',
        description: expense.description,
        subtotal: expense.subtotal,
        taxAmount: expense.taxAmount,
        totalAmount: expense.totalAmount,
        vatTypeId: expense.vatTypeId || '',
        clinicId: expense.clinicId,
        status: expense.status,
      });
    } else {
      form.reset();
    }
  }, [expense, form]);

  // Calcular el total cuando cambian el subtotal o IVA
  const watchSubtotal = form.watch('subtotal');
  const watchTaxAmount = form.watch('taxAmount');
  const watchVatTypeId = form.watch('vatTypeId');

  useEffect(() => {
    if (watchVatTypeId && watchSubtotal) {
      const vatType = vatTypes.find(vt => vt.id === watchVatTypeId);
      if (vatType) {
        const taxAmount = (watchSubtotal * vatType.rate) / 100;
        form.setValue('taxAmount', Number(taxAmount.toFixed(2)));
      }
    }
  }, [watchVatTypeId, watchSubtotal, vatTypes, form]);

  useEffect(() => {
    const total = (watchSubtotal || 0) + (watchTaxAmount || 0);
    form.setValue('totalAmount', Number(total.toFixed(2)));
  }, [watchSubtotal, watchTaxAmount, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      const url = expense 
        ? `/api/expenses/${expense.id}`
        : '/api/expenses';
      
      const method = expense ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          vatTypeId: values.vatTypeId === 'no-vat' ? undefined : values.vatTypeId
        }),
      });

      if (response.ok) {
        toast.success(expense ? 'Gasto actualizado' : 'Gasto creado');
        onClose();
        window.location.reload(); // TODO: Mejorar con revalidación
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar el gasto');
      }
    } catch (error) {
      toast.error('Error al guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {expense ? 'Editar Gasto' : 'Nuevo Gasto'}
          </DialogTitle>
          <DialogDescription>
            {expense 
              ? 'Modifica los datos del gasto seleccionado'
              : 'Completa el formulario para registrar un nuevo gasto'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Fecha */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Número de factura */}
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura</FormLabel>
                    <FormControl>
                      <Input placeholder="FAC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Proveedor */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proveedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo de gasto */}
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Gasto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Clínica */}
              <FormField
                control={form.control}
                name="clinicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clínica</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una clínica" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe el gasto..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              {/* Subtotal */}
              <FormField
                control={form.control}
                name="subtotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtotal</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tipo de IVA */}
              <FormField
                control={form.control}
                name="vatTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de IVA</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-vat">Sin IVA</SelectItem>
                        {vatTypes.map((vat) => (
                          <SelectItem key={vat.id} value={vat.id}>
                            {vat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* IVA */}
              <FormField
                control={form.control}
                name="taxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IVA</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total */}
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      readOnly
                      {...field}
                      className="font-semibold"
                    />
                  </FormControl>
                  <FormDescription>
                    Se calcula automáticamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="APPROVED">Aprobado</SelectItem>
                      <SelectItem value="PAID">Pagado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Si el estado es "Aprobado", se generará un asiento contable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
