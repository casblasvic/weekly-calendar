"use client";

import React, { useState, useEffect } from 'react';
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
    price: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
});

const packageDefinitionFormSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    description: z.string().optional(),
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
    onCancel: () => void;
    initialData?: PackageDefinitionFormData | null;
    isLoading?: boolean;
}

export function PackageDefinitionForm({
    onSubmit,
    onCancel,
    initialData = null,
    isLoading = false,
}: PackageDefinitionFormProps) {

    const { t } = useTranslation();

    const form = useForm<PackageDefinitionFormData>({
        resolver: zodResolver(packageDefinitionFormSchema),
        defaultValues: initialData || {
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
    const [priceToAdd, setPriceToAdd] = useState<string>("");
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
                    fetch('/api/services?limit=1000'), // Ajustar límite según necesidad
                    fetch('/api/products?limit=1000') // Ajustar límite según necesidad
                ]);
                if (!servicesRes.ok || !productsRes.ok) {
                    throw new Error(t('packages.form.toasts.loadItemsError'));
                }
                const servicesData = await servicesRes.json(); // servicesData es el array
                const productsData = await productsRes.json(); // productsData es el array
                
                // <<< CORRECCIÓN: Asignar directamente el array, con verificación >>>
                setServices(Array.isArray(servicesData) ? servicesData : []);
                setProducts(Array.isArray(productsData) ? productsData : []);

            } catch (error: any) {
                toast.error(t('common.errors.loadingTitle'), { 
                    description: t('packages.form.toasts.loadItemsError') + (error.message ? `: ${error.message}` : '') 
                });
                // Asegurarse de limpiar los estados en caso de error
                setServices([]); 
                setProducts([]);
            } finally {
                setLoadingItems(false);
            }
        };
        fetchItems();
    }, [t]);

    const itemsOptions = (itemTypeToAdd === 'SERVICE' ? services : products).map(item => ({
        value: item.id,
        label: item.name,
        basePrice: item.price
    }));

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
        
        const numericPrice = priceToAdd.trim() !== "" ? parseFloat(priceToAdd) : undefined;
        if (numericPrice !== undefined && isNaN(numericPrice)) {
             toast.error(t('packages.form.toasts.invalidPriceTitle'), { 
                 description: t('packages.form.toasts.invalidPriceDesc') 
             });
             return;
        }

        append({ 
            itemType: itemTypeToAdd, 
            itemId: selectedItemToAdd.value, 
            quantity: quantityToAdd, 
            price: numericPrice,
        });
        setSelectedItemToAdd(null);
        setQuantityToAdd(1);
        setPriceToAdd("");
        setComboboxOpen(false);
    };

    const getSelectedItemName = (itemType: 'SERVICE' | 'PRODUCT', itemId: string): string => {
        const list = itemType === 'SERVICE' ? services : products;
        return list.find(item => item.id === itemId)?.name || t('common.unknown');
    };

    const processSubmit: SubmitHandler<PackageDefinitionFormData> = async (data) => {
        // console.log("Intentando enviar datos:", data);
        try {
            await onSubmit(data);
        } catch (error) {
            console.error("Error dentro de processSubmit al llamar a onSubmit:", error);
            toast.error(t('common.errors.unexpectedTitle'), { 
                description: t('common.errors.formProcessingDesc') + (error instanceof Error ? `: ${error.message}` : '')
            });
        }
    };

    const calculatedLinesSum = fields.reduce((sum, item) => {
        const price = item.price ?? 0;
        const quantity = item.quantity || 0;
        return sum + (price * quantity);
    }, 0);

    return (
        <FormProvider {...form}>
            <Form form={form} onSubmit={processSubmit}>
                <div className="space-y-8">
                    {/* Campos Principales */}
                    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="packageName">{t('packages.form.labels.name')}</Label>
                            <Input
                                id="packageName"
                                placeholder={t('packages.form.placeholders.name')}
                                {...form.register("name")}
                                disabled={isLoading}
                            />
                            {form.formState.errors.name && (
                                <p className="text-sm font-medium text-destructive">
                                    {form.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="packagePrice">{t('packages.form.labels.price')}</Label>
                            <Input
                                id="packagePrice"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...form.register("price", { valueAsNumber: true })}
                                disabled={isLoading}
                            />
                            {calculatedLinesSum > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('packages.form.labels.linesSum')} {formatCurrency(calculatedLinesSum)}
                                </p>
                            )}
                            {form.formState.errors.price && (
                                <p className="text-sm font-medium text-destructive">
                                    {form.formState.errors.price.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="mb-8">
                                <FormLabel>{t('packages.form.labels.description')}</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        placeholder={t('packages.form.placeholders.description')}
                                        {...field} 
                                        disabled={isLoading} 
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="pointsAwarded"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('packages.form.labels.pointsAwarded')}</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between p-4 space-x-3 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <FormLabel>{t('packages.form.labels.isActive')}</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Sección de Items del Paquete */}
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>{t('packages.form.items.title')}</CardTitle>
                            <CardDescription>{t('packages.form.items.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 space-y-4">
                                {fields.map((field, index) => {
                                    const lineTotal = (field.price ?? 0) * (field.quantity || 0);
                                    
                                    return (
                                        <div key={field.id} className="flex flex-wrap items-center p-3 space-x-4 border rounded-md">
                                            <span className="flex-1 min-w-[150px]">
                                                {field.itemType === 'SERVICE' ? t('packages.form.items.typeService') : t('packages.form.items.typeProduct')} - {getSelectedItemName(field.itemType, field.itemId)}
                                            </span>
                                            <span className="text-sm text-muted-foreground">{t('packages.form.items.quantityLabel')} {field.quantity}</span>
                                            {field.price !== undefined && field.price !== null && (
                                                <span className="text-sm font-medium">{t('packages.form.items.lineTotalLabel')} {formatCurrency(lineTotal)}</span>
                                            )}
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => remove(index)} 
                                                disabled={isLoading}
                                                title={t('packages.form.items.deleteItemTitle')}
                                                className="ml-auto"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    );
                                })}
                                {form.formState.errors.items && fields.length === 0 && (
                                    <p className="text-sm font-medium text-destructive">
                                        {form.formState.errors.items.message || form.formState.errors.items.root?.message}
                                    </p>
                                )}
                            </div>

                            {/* Controles para añadir nuevo item */}
                            <div className="flex flex-col flex-wrap items-start p-4 space-y-4 border rounded-md sm:flex-row sm:items-end sm:space-y-0 sm:space-x-4 bg-muted/40">
                                <div className="flex-grow w-full sm:w-auto min-w-[120px]">
                                    <Label htmlFor="itemTypeSelect">{t('packages.form.addItem.typeLabel')}</Label>
                                    <Select 
                                        value={itemTypeToAdd} 
                                        onValueChange={(value: 'SERVICE' | 'PRODUCT') => {
                                            setItemTypeToAdd(value);
                                            setSelectedItemToAdd(null);
                                            setPriceToAdd("");
                                        }}
                                        disabled={isLoading || loadingItems}
                                    >
                                        <SelectTrigger id="itemTypeSelect">
                                            <SelectValue placeholder={t('packages.form.addItem.typePlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SERVICE">{t('packages.form.addItem.typeService')}</SelectItem>
                                            <SelectItem value="PRODUCT">{t('packages.form.addItem.typeProduct')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex-grow w-full sm:w-auto min-w-[200px]">
                                     <Label>{t('packages.form.addItem.itemLabel')}</Label>
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={comboboxOpen}
                                                className="justify-between w-full font-normal"
                                                disabled={isLoading || loadingItems || itemsOptions.length === 0}
                                            >
                                                {selectedItemToAdd
                                                    ? selectedItemToAdd.label
                                                    : loadingItems ? t('packages.form.addItem.itemLoading') : t('packages.form.addItem.itemPlaceholder')}
                                                <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                            <Command>
                                                <CommandInput placeholder={`${t(itemTypeToAdd === 'SERVICE' ? 'packages.form.addItem.searchService' : 'packages.form.addItem.searchProduct')}...`} />
                                                <CommandList>
                                                    <CommandEmpty>{t('packages.form.addItem.searchEmpty')}</CommandEmpty>
                                                    <CommandGroup>
                                                        {itemsOptions.map((option) => (
                                                            <CommandItem
                                                                key={option.value}
                                                                value={option.label}
                                                                onSelect={(currentValue) => {
                                                                    const currentLabel = currentValue.trim().toLowerCase();
                                                                    const selected = itemsOptions.find(opt => opt.label.trim().toLowerCase() === currentLabel);
                                                                    console.log("Item seleccionado:", selected);
                                                                    setSelectedItemToAdd(selected || null);
                                                                    setPriceToAdd(selected?.basePrice?.toString() ?? "");
                                                                    setComboboxOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        selectedItemToAdd?.value === option.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {option.label}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="w-full sm:w-24">
                                    <Label htmlFor="quantityInput">{t('packages.form.addItem.quantityLabel')}</Label>
                                    <Input 
                                        id="quantityInput" 
                                        type="number" 
                                        min="1" 
                                        value={quantityToAdd} 
                                        onChange={(e) => setQuantityToAdd(parseInt(e.target.value, 10) || 1)} 
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="w-full sm:w-28">
                                    <Label htmlFor="priceInput">{t('packages.form.addItem.priceLabel')}</Label>
                                    <Input 
                                        id="priceInput" 
                                        type="number" 
                                        step="0.01"
                                        placeholder={t('packages.form.placeholders.priceOptional')}
                                        value={priceToAdd} 
                                        onChange={(e) => setPriceToAdd(e.target.value)} 
                                        disabled={isLoading || !selectedItemToAdd}
                                    />
                                </div>

                                <Button 
                                    type="button" 
                                    onClick={handleAddItem} 
                                    disabled={isLoading || loadingItems || !selectedItemToAdd} 
                                    className="self-end w-full mt-4 sm:w-auto sm:mt-0"
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" /> {t('packages.form.addItem.addButton')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Botones de Acción */}
                    <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                            {isLoading ? t('common.saving') : (initialData ? t('packages.form.buttons.update') : t('packages.form.buttons.create'))}
                        </Button>
                    </div>
                </div>
            </Form>
        </FormProvider>
    );
} 