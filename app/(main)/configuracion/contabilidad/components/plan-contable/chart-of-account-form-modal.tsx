"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AccountType } from '@prisma/client'; // Asegúrate que la ruta es correcta

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react"; // Importar Loader2 para el spinner
import { ChartOfAccountRow } from './columns'; // Para tipar initialData

// Esquema Zod para la validación del formulario
const accountFormSchema = z.object({
  accountNumber: z.string().min(1, "El número de cuenta es obligatorio."),
  name: z.string().min(1, "El nombre es obligatorio."),
  type: z.nativeEnum(AccountType, {
    errorMap: () => ({ message: "Debe seleccionar un tipo de cuenta válido." }),
  }),
  description: z.string().optional(),
  isMonetary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  parentAccountId: z.string().nullable().optional(), // Puede ser null o no estar presente
  allowsDirectEntry: z.boolean().default(true), // Por defecto permite asientos directos
});

export type AccountFormData = z.infer<typeof accountFormSchema>;

export function ChartOfAccountFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => void;
  initialData?: Partial<ChartOfAccountRow>; // Usamos Partial porque no todos los campos de la fila son del formulario
}) {
  const {
    register,
    handleSubmit,
    reset,
    control, // Para el componente Select de shadcn/ui
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    // defaultValues se manejan mejor con useEffect y reset para initialData dinámico
  });

  useEffect(() => {
    if (isOpen) {
      const defaultVals = {
        accountNumber: initialData?.accountNumber || '',
        name: initialData?.name || '',
        type: initialData?.type || undefined,
        description: initialData?.description || '',
        isMonetary: initialData?.isMonetary === undefined ? false : initialData.isMonetary,
        isActive: initialData?.isActive === undefined ? true : initialData.isActive,
        parentAccountId: initialData?.parentAccountId || null,
        allowsDirectEntry: initialData?.allowsDirectEntry === undefined ? true : initialData.allowsDirectEntry,
      };
      reset(defaultVals);
    } else {
      // Opcional: resetear a un estado completamente limpio si el modal se cierra sin enviar
      // reset(accountFormSchema.parse({})); // o valores por defecto específicos
    }
  }, [isOpen, initialData, reset]);

  const handleFormSubmit = (data: AccountFormData) => {
    onSubmit(data);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}</DialogTitle>
          <DialogDescription>
            {initialData?.id ? 'Modifica los detalles de la cuenta.' : 'Añade una nueva cuenta al plan contable.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
          {initialData?.parentAccountId && (
            <p className="text-sm text-muted-foreground">
              Subcuenta de ID: {initialData.parentAccountId}
            </p>
          )}

          <div>
            <Label htmlFor="accountNumber">Número de Cuenta</Label>
            <Input id="accountNumber" {...register("accountNumber")} />
            {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber.message}</p>}
          </div>

          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="type">Tipo de Cuenta</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AccountType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type} {/* Podrías tener un mapeo a nombres más amigables aquí */}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" {...register("description")} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>
          
          <div className="flex items-center space-x-2">
            <Controller
                name="isMonetary"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        id="isMonetary"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="isMonetary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Es cuenta monetaria (afecta al balance)
            </Label>
            {errors.isMonetary && <p className="text-sm text-red-500">{errors.isMonetary.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
             <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        id="isActive"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Cuenta activa
            </Label>
            {errors.isActive && <p className="text-sm text-red-500">{errors.isActive.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Controller
                name="allowsDirectEntry"
                control={control}
                render={({ field }) => (
                    <Checkbox
                        id="allowsDirectEntry"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="allowsDirectEntry" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Permite asientos directos
            </Label>
            {errors.allowsDirectEntry && <p className="text-sm text-red-500">{errors.allowsDirectEntry.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                initialData?.id ? 'Guardar Cambios' : 'Crear Cuenta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
