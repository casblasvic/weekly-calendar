"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, PlusCircle, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format-utils';
import { useTranslation } from 'react-i18next';

// --- Tipos (Se inferirán de Zod, mantener referencia si es útil) ---
interface Service { id: string; name: string; price?: number | null; }
interface Product { id: string; name: string; price?: number | null; }

// --- Zod Schema (Fuente de la verdad para tipos) ---
const packageItemSchema = z.object({
    id: z.string().optional(),
    itemType: z.enum(['SERVICE', 'PRODUCT']),
    itemId: z.string().min(1, "Debes seleccionar un servicio o producto."),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1."),
    price: z.string().trim().optional().nullable().transform((val, ctx) => {
        if (val === undefined || val === "" || val === null) return undefined;
        const num = Number(val);
        if (isNaN(num)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El precio debe ser un número válido o estar vacío.",
            });
            return z.NEVER;
        }
        return num;
    }),
});

const packageDefinitionFormSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    description: z.string().nullish(),
    price: z.coerce.number().min(0, "El precio no puede ser negativo."),
    isActive: z.boolean().default(true),
    pointsAwarded: z.coerce.number().min(0, "Los puntos no pueden ser negativos.").default(0),
    items: z.array(packageItemSchema).min(1, "El paquete debe contener al menos un ítem."),
});

// --- Inferir tipo principal desde Zod ---
type PackageDefinitionFormData = z.infer<typeof packageDefinitionFormSchema>;

// --- Props del Componente ---
interface PackageDefinitionFormProps {
    onSubmit: (data: PackageDefinitionFormData) => Promise<void>;
    initialData?: PackageDefinitionFormData | null;
    formId: string;
}

export function PackageDefinitionForm({
    onSubmit,
    initialData = null,
    formId,
}: PackageDefinitionFormProps) {

    const { t } = useTranslation();

    const form = useForm<PackageDefinitionFormData>({
        resolver: zodResolver(packageDefinitionFormSchema),
        defaultValues: initialData ? {
            ...initialData,
            items: initialData.items.map(item => ({
                ...item,
                price: item.price !== undefined && item.price !== null ? String(item.price) : undefined,
            }))
        } : {
            name: '',
            description: '', 
            price: 0,
            isActive: true,
            pointsAwarded: 0,
            items: [], 
        },
        mode: "onChange",
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    // Estados para la selección de items
    const [itemTypeToAdd, setItemTypeToAdd] = useState<'SERVICE' | 'PRODUCT'>('SERVICE');
    const [selectedItemToAdd, setSelectedItemToAdd] = useState<{ value: string; label: string; basePrice?: number | null } | null>(null);
    const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
    const [priceToAdd, setPriceToAdd] = useState<string>(""); // User input for price is string
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [comboboxOpen, setComboboxOpen] = useState(false);

    // Fetch Servicios y Productos
    useEffect(() => {
        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const [servicesRes, productsRes] = await Promise.all([
                    fetch('/api/services?limit=1000'),
                    fetch('/api/products?limit=1000')
                ]);
                if (!servicesRes.ok || !productsRes.ok) {
                    throw new Error(t('packages.form.toasts.loadItemsError'));
                }
                const servicesData = await servicesRes.json();
                const productsData = await productsRes.json();
                setServices(Array.isArray(servicesData) ? servicesData : []);
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (error: any) {
                toast.error(t('common.errors.loadingTitle'), {
                    description: t('packages.form.toasts.loadItemsError') + (error.message ? `: ${error.message}` : '')
                });
                setServices([]); 
                setProducts([]);
            } finally {
                setLoadingItems(false);
            }
        };
        fetchItems();
    }, [t]);

    const itemsOptions = useMemo(() => {
      return (itemTypeToAdd === 'SERVICE' ? services : products).map(item => ({
          value: item.id,
          label: item.name,
          basePrice: item.price
      }));
    }, [itemTypeToAdd, services, products]);

    const handleAddItem = () => {
        if (!selectedItemToAdd || quantityToAdd <= 0) {
            toast.warning(t('packages.form.toasts.invalidSelectionTitle'), {
                description: t('packages.form.toasts.invalidSelectionDesc')
            });
            return;
        }
        const exists = fields.some(field => field.itemType === itemTypeToAdd && field.itemId === selectedItemToAdd.value);
        if (exists) {
            toast.warning(t('packages.form.toasts.duplicateItemTitle'), {
                description: t('packages.form.toasts.duplicateItemDesc')
            });
            return;
        }
        
        append({
            itemType: itemTypeToAdd,
            itemId: selectedItemToAdd.value,
            quantity: quantityToAdd,
            price: priceToAdd, 
        } as any); 
        setSelectedItemToAdd(null);
        setQuantityToAdd(1);
        setPriceToAdd("");
        setComboboxOpen(false);
    };

    const getSelectedItemName = (itemType: 'SERVICE' | 'PRODUCT', itemId: string): string => {
        const list = itemType === 'SERVICE' ? services : products;
        return list.find(item => item.id === itemId)?.name || t('common.unknown');
    };

    const processSubmit = async (data: PackageDefinitionFormData) => {
        console.log("Datos del formulario ANTES de transformar items:", data);

        // Transformar items para asegurar serviceId/productId mutuamente excluyentes y nulos
        const transformedItems = data.items.map(item => {
            if (item.itemType === 'SERVICE') {
                return {
                    ...item,
                    serviceId: item.itemId,
                    productId: null, // Asegurar que productId sea null
                };
            } else if (item.itemType === 'PRODUCT') {
                return {
                    ...item,
                    productId: item.itemId,
                    serviceId: null, // Asegurar que serviceId sea null
                };
            }
            return item; // No debería ocurrir si itemType está validado
        });

        const payload = {
            ...data,
            items: transformedItems,
        };

        console.log("Datos del formulario DESPUÉS de transformar items (payload para onSubmit prop):", payload);
        await onSubmit(payload); // Llamar a la prop onSubmit con los datos transformados
    };

    const calculatedLinesSum = useMemo(() => {
        return fields.reduce((sum, item, index) => {
            const currentItemPrice = form.watch(`items.${index}.price`);
            let priceToUse: number | undefined = currentItemPrice;

            if (priceToUse === undefined) {
                const list = item.itemType === 'SERVICE' ? services : products;
                const baseItem = list.find(i => i.id === item.itemId);
                priceToUse = baseItem?.price ?? undefined;
            }
            
            const quantity = item.quantity || 0;
            return sum + ((priceToUse ?? 0) * quantity);
        }, 0);
    }, [fields, services, products, form.watch]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="p-6 space-y-8" id={formId}>
                
                {/* Section 1: Basic Info (Grid Layout) */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('packages.form.basicInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('packages.form.labels.name')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('packages.form.placeholders.name')} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('packages.form.labels.price')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                        </FormControl>
                                         {calculatedLinesSum > 0 && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {t('packages.form.labels.linesSum')} {formatCurrency(calculatedLinesSum)}
                                            </p>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('packages.form.labels.description')}</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder={t('packages.form.placeholders.description')} 
                                            {...field} 
                                            value={field.value ?? ''} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="pointsAwarded"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('packages.form.labels.pointsAwarded')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="1" placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4 md:mt-0">
                                        <div className="space-y-0.5">
                                            <FormLabel>{t('packages.form.labels.isActive')}</FormLabel>
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
                    </CardContent>
                </Card>

                {/* Section 2: Package Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('packages.form.items.title')}</CardTitle>
                        <CardDescription>{t('packages.form.items.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 mb-6">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-3 p-3 border rounded-md bg-gray-50/50">
                                    <div className="flex-shrink-0 w-16 text-xs font-semibold text-center uppercase text-muted-foreground">
                                        {field.itemType === 'SERVICE' ? t('packages.form.items.typeService') : t('packages.form.items.typeProduct')}
                                    </div>
                                    <div className="flex-grow text-sm font-medium">
                                        {getSelectedItemName(field.itemType, field.itemId)}
                                    </div>
                                    <div className="flex-shrink-0 w-20">
                                         <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="w-full">
                                                    <FormLabel className="sr-only">{t('packages.form.items.quantityLabel')}</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" {...field} className="h-8 text-center" />
                                                    </FormControl>
                                                    <FormMessage className="text-xs"/>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="flex-shrink-0 w-24">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.price`}
                                            render={({ field: { value, onChange, ...restField } }) => (
                                                <FormItem className="w-full">
                                                    <FormLabel className="sr-only">{t('packages.form.addItem.priceLabel')}</FormLabel>
                                                    <FormControl>
                                                         <Input 
                                                             type="text" 
                                                             placeholder={t('packages.form.placeholders.priceOptional')} 
                                                             {...restField}
                                                             value={value === undefined || value === null ? '' : String(value)} 
                                                             onChange={(e) => {
                                                                onChange(e.target.value);
                                                             }}
                                                             className="h-8 text-right" 
                                                         />
                                                    </FormControl>
                                                    <FormMessage className="text-xs"/>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="flex-shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            title={t('packages.form.items.deleteItemTitle')}
                                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {form.formState.errors.items && !form.formState.errors.items.root && !Array.isArray(form.formState.errors.items) && (
                                <p className="text-sm font-medium text-destructive">
                                    {form.formState.errors.items.message} 
                                </p>
                            )}
                            {Array.isArray(form.formState.errors.items) && (
                                form.formState.errors.items.map((error, index) => (
                                    error && (
                                        <p key={index} className="text-sm font-medium text-destructive">
                                            Error en Ítem {index + 1}: {error.itemId?.message || error.quantity?.message || error.price?.message || error.itemType?.message}
                                        </p>
                                    )
                                ))
                            )}
                            {fields.length === 0 && (
                                <p className="text-sm text-center text-muted-foreground py-4">{t('packages.form.items.empty')}</p>
                            )}
                        </div>

                        <div className="p-4 space-y-4 border border-dashed rounded-md">
                             <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div className="col-span-1 sm:col-span-1">
                                    <Label>{t('packages.form.addItem.typeLabel')}</Label>
                                    <Select value={itemTypeToAdd} onValueChange={(value: 'SERVICE' | 'PRODUCT') => { setItemTypeToAdd(value); setSelectedItemToAdd(null); }} disabled={loadingItems}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('packages.form.addItem.typePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SERVICE">{t('packages.form.items.typeService')}</SelectItem>
                                            <SelectItem value="PRODUCT">{t('packages.form.items.typeProduct')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-1 sm:col-span-3">
                                    <Label>{t('packages.form.addItem.itemLabel')}</Label>
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={comboboxOpen}
                                                className="w-full justify-between font-normal"
                                                disabled={loadingItems || itemsOptions.length === 0}
                                            >
                                                <span className="truncate">
                                                     {selectedItemToAdd
                                                         ? selectedItemToAdd.label
                                                         : t('packages.form.addItem.itemPlaceholder')}
                                                </span>
                                                <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[--radix-popover-content-available-height]">
                                            <Command>
                                                <CommandInput 
                                                    placeholder={itemTypeToAdd === 'SERVICE' ? t('packages.form.addItem.searchService') : t('packages.form.addItem.searchProduct')} 
                                                />
                                                <CommandList>
                                                    <CommandEmpty>{t('packages.form.addItem.searchEmpty')}</CommandEmpty>
                                                    <CommandGroup>
                                                        {itemsOptions.map((option) => (
                                                            <CommandItem
                                                                key={option.value}
                                                                value={option.label} 
                                                                onSelect={(currentValue) => {
                                                                    const selectedLabel = currentValue?.trim().toLowerCase();
                                                                    const selected = itemsOptions.find(
                                                                        opt => opt.label?.trim().toLowerCase() === selectedLabel
                                                                    );
                                                                    setSelectedItemToAdd(selected || null);
                                                                    setPriceToAdd(selected?.basePrice !== undefined && selected?.basePrice !== null ? String(selected.basePrice) : '') 
                                                                    setComboboxOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedItemToAdd?.value === option.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <span className="flex-1 truncate">{option.label}</span>
                                                                {option.basePrice !== undefined && option.basePrice !== null && (
                                                                    <span className="ml-2 text-xs text-muted-foreground">{formatCurrency(option.basePrice)}</span>
                                                                )}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <div className="col-span-1 sm:col-span-1">
                                    <Label htmlFor="quantityToAdd">{t('packages.form.addItem.quantityLabel')}</Label>
                                    <Input
                                        id="quantityToAdd"
                                        type="number"
                                        min="1"
                                        value={quantityToAdd}
                                        onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="text-center"
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-1">
                                    <Label htmlFor="priceToAdd">{t('packages.form.addItem.priceLabel')} ({t('common.optional_short')})</Label>
                                     <Input
                                         id="priceToAdd"
                                         type="text" 
                                         placeholder={t('packages.form.placeholders.priceOptional')} 
                                         value={priceToAdd} 
                                         onChange={(e) => {
                                             const value = e.target.value;
                                             if (value === '' || /^[0-9]*\.?[\d]*$/.test(value)) { 
                                                 setPriceToAdd(value);
                                             }
                                         }}
                                         className="text-right"
                                     />
                                 </div>
                                <div className="col-span-1 sm:col-span-2 flex items-end">
                                    <Button 
                                        type="button" 
                                        onClick={handleAddItem} 
                                        disabled={!selectedItemToAdd || loadingItems}
                                        className="w-full"
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        {t('packages.form.addItem.addButton')}
                                    </Button>
                                </div>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
} 