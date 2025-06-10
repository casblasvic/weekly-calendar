'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Building2, User, CreditCard, FileText, Tag } from 'lucide-react';

// Schema de validación
const SupplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  tradeName: z.string().optional(),
  vat: z.string().min(1, 'El NIF/CIF es requerido'),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default('ES'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  iban: z.string().optional(),
  paymentTerms: z.number().int().min(0).default(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  isSupplier: z.boolean().default(true),
  isClient: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

type SupplierFormData = z.infer<typeof SupplierSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: any | null;
  onClose: () => void;
}

export function SupplierDialog({ open, onOpenChange, supplier, onClose }: SupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: {
      name: '',
      tradeName: '',
      vat: '',
      address: '',
      postalCode: '',
      city: '',
      province: '',
      country: 'ES',
      phone: '',
      email: '',
      contactPerson: '',
      website: '',
      iban: '',
      paymentTerms: 0,
      discountPercentage: 0,
      notes: '',
      isActive: true,
      isSupplier: true,
      isClient: false,
      tags: [],
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || '',
        tradeName: supplier.tradeName || '',
        vat: supplier.vat || '',
        address: supplier.address || '',
        postalCode: supplier.postalCode || '',
        city: supplier.city || '',
        province: supplier.province || '',
        country: supplier.country || 'ES',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contactPerson: supplier.contactPerson || '',
        website: supplier.website || '',
        iban: supplier.iban || '',
        paymentTerms: supplier.paymentTerms || 0,
        discountPercentage: supplier.discountPercentage || 0,
        notes: supplier.notes || '',
        isActive: supplier.isActive ?? true,
        isSupplier: supplier.isSupplier ?? true,
        isClient: supplier.isClient ?? false,
        tags: supplier.tags || [],
      });
      setTags(supplier.tags || []);
    } else {
      form.reset();
      setTags([]);
    }
  }, [supplier, form]);

  const onSubmit = async (data: SupplierFormData) => {
    try {
      setLoading(true);
      
      const submitData = {
        ...data,
        tags,
      };

      const url = supplier
        ? `/api/suppliers/${supplier.id}`
        : '/api/suppliers';
      
      const method = supplier ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          supplier
            ? 'Proveedor actualizado correctamente'
            : 'Proveedor creado correctamente'
        );
        onClose();
        window.location.reload();
      } else {
        toast.error(result.error || 'Error al guardar proveedor');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Error al guardar proveedor');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? 'Modifica los datos del proveedor'
              : 'Introduce los datos del nuevo proveedor'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[60vh] px-1">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">
                    <Building2 className="mr-2 h-4 w-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="contact">
                    <User className="mr-2 h-4 w-4" />
                    Contacto
                  </TabsTrigger>
                  <TabsTrigger value="financial">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Financiero
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <FileText className="mr-2 h-4 w-4" />
                    Notas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del proveedor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre comercial</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre comercial (opcional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIF/NIF *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="A12345678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isSupplier"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Es proveedor</FormLabel>
                            <FormDescription className="text-xs">
                              Puede recibir pedidos
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isClient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Es cliente</FormLabel>
                            <FormDescription className="text-xs">
                              Puede hacer compras
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Activo</FormLabel>
                          <FormDescription className="text-xs">
                            Desactiva si no quieres usar este proveedor temporalmente
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="contact" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de contacto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del contacto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+34 600 000 000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="proveedor@ejemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sitio web</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://www.ejemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Calle Principal, 123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código postal</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="28001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ciudad</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Madrid" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Madrid" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IBAN</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ES00 0000 0000 0000 0000 0000" />
                        </FormControl>
                        <FormDescription>
                          Cuenta bancaria para pagos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plazo de pago (días)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Días para el vencimiento de facturas
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.01"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Descuento aplicado por defecto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Notas adicionales sobre el proveedor..."
                            rows={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Etiquetas</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Nueva etiqueta"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <Button type="button" onClick={addTag} variant="outline">
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>

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
                {loading ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
