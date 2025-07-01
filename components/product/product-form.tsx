"use client"

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Category, VATType } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast as sonnerToast } from "sonner";
// ✅ ELIMINADO: Imports de tooltips para implementación global futura

// Tipo ampliado para el producto que puede venir con relaciones
type ProductWithRelations = Product & {
    category?: Category | null;
    vatType?: VATType | null;
    settings?: {
        id: string;
        isForSale: boolean;
        isInternalUse: boolean;
        isActive: boolean;
    } | null;
    // Añadir otras relaciones si fueran necesarias para el form
};

// Props del componente de formulario
interface ProductFormProps {
    initialData?: ProductWithRelations | null;
    isSaving: boolean;
    onSubmit: (data: any) => Promise<void>; // Cambiar 'any' por un tipo más específico si es posible
}

// Interfaz para los datos del formulario (refleja los campos del diseño)
interface ProductFormData {
    name: string;
    categoryId: string | null;
    priceWithVat: number | string; // Asumo que el usuario introduce precio CON IVA
    vatTypeId: string | null;
    belongsToFlatRate: string | null; // ID de tarifa plana?
    consumptionUnits: number | string;
    consumptionType: string | null; // ID o nombre del tipo?
    costPriceWithVat: number | string;
    purchaseVatTypeId: string | null;
    ean: string | null;
    sku: string | null;
    commissionType: 'Global' | 'Percentage' | 'Fixed'; // Asumiendo estos tipos
    commissionValue: number | string | null;
    isForSale: boolean;
    isInternalUse: boolean;
    automaticDiscounts: boolean;
    manualDiscounts: boolean;
    acceptsPromotions: boolean;
    affectsStatistics: boolean;
    requiresLotReference: boolean;
    isDisabled: boolean; // Mapea a !isActive?
}

// <<< AÑADIR ESTADO INICIAL POR DEFECTO PARA EL FORMULARIO >>>
const defaultProductFormData: ProductFormData = {
    name: '',
    categoryId: null,
    priceWithVat: '',
    vatTypeId: null,
    belongsToFlatRate: null,
    consumptionUnits: '',
    consumptionType: null,
    costPriceWithVat: '',
    purchaseVatTypeId: null,
    ean: null,
    sku: null,
    commissionType: 'Global',
    commissionValue: null,
    isForSale: true,
    isInternalUse: false,
    automaticDiscounts: false,
    manualDiscounts: true,
    acceptsPromotions: true,
    affectsStatistics: true,
    requiresLotReference: false,
    isDisabled: false,
};

export function ProductForm({ initialData, isSaving, onSubmit }: ProductFormProps) {
    const router = useRouter();
    // <<< USAR EL ESTADO INICIAL COMPLETO Y QUITAR Partial >>>
    const [formData, setFormData] = useState<ProductFormData>(defaultProductFormData);
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    // TODO: Cargar otros datos necesarios (tipos de comisión, tarifas planas, tipos de consumo?)
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
    const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
    const [openVatCombobox, setOpenVatCombobox] = useState(false);
    const [openPurchaseVatCombobox, setOpenPurchaseVatCombobox] = useState(false);

    // Cargar datos para selects
    useEffect(() => {
        async function loadDropdownData() {
            setIsLoadingDropdowns(true);
            try {
                const [catRes, vatRes] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/vat-types'),
                    // TODO: Fetch otros datos
                ]);
                if (!catRes.ok || !vatRes.ok) throw new Error("Error cargando datos para formulario");
                setCategories(await catRes.json());
                setVatTypes(await vatRes.json());
            } catch (error) {
                console.error("Error loading dropdown data:", error);
                sonnerToast.error("Error al cargar opciones del formulario.");
            } finally {
                setIsLoadingDropdowns(false);
            }
        }
        loadDropdownData();
    }, []);

    // Inicializar formulario con datos existentes o valores por defecto
    useEffect(() => {
        if (initialData) {
            // Mapear initialData a ProductFormData
            setFormData({
                name: initialData.name ?? defaultProductFormData.name,
                categoryId: initialData.categoryId ?? defaultProductFormData.categoryId,
                priceWithVat: initialData.price?.toString() ?? defaultProductFormData.priceWithVat,
                vatTypeId: initialData.vatTypeId ?? defaultProductFormData.vatTypeId,
                belongsToFlatRate: defaultProductFormData.belongsToFlatRate, // Asumir default, mapear si initialData lo tiene
                consumptionUnits: defaultProductFormData.consumptionUnits, // Asumir default, mapear si initialData lo tiene
                consumptionType: defaultProductFormData.consumptionType, // Asumir default, mapear si initialData lo tiene
                costPriceWithVat: defaultProductFormData.costPriceWithVat, // Asumir default, mapear si initialData lo tiene
                purchaseVatTypeId: defaultProductFormData.purchaseVatTypeId, // Asumir default, mapear si initialData lo tiene
                ean: initialData.barcode ?? defaultProductFormData.ean,
                sku: initialData.sku ?? defaultProductFormData.sku,
                commissionType: defaultProductFormData.commissionType, // Usar default o mapear si initialData lo tiene
                commissionValue: defaultProductFormData.commissionValue, // Usar default o mapear si initialData lo tiene
                isForSale: initialData.settings?.isForSale ?? defaultProductFormData.isForSale,
                isInternalUse: initialData.settings?.isInternalUse ?? defaultProductFormData.isInternalUse,
                automaticDiscounts: defaultProductFormData.automaticDiscounts, // Usar default o mapear si initialData lo tiene
                manualDiscounts: defaultProductFormData.manualDiscounts, // Usar default o mapear si initialData lo tiene
                acceptsPromotions: defaultProductFormData.acceptsPromotions, // Usar default o mapear si initialData lo tiene
                affectsStatistics: defaultProductFormData.affectsStatistics, // Usar default o mapear si initialData lo tiene
                requiresLotReference: defaultProductFormData.requiresLotReference, // Usar default o mapear si initialData lo tiene
                isDisabled: initialData.settings?.isActive !== undefined ? !initialData.settings.isActive : defaultProductFormData.isDisabled,
            });
        } else {
            // Para nuevo producto o si initialData se vuelve null, resetear a los valores por defecto.
            setFormData(defaultProductFormData);
        }
    }, [initialData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumeric = type === 'number';
        setFormData(prev => ({ 
            ...prev, 
            [name]: isNumeric ? (value === '' ? '' : Number(value)) : value 
        }));
    };

    const handleSelectChange = (value: string, name: keyof ProductFormData) => {
        setFormData(prev => ({ ...prev, [name]: value || null }));
    };
    
    const handleCheckboxChange = (checked: boolean, name: keyof ProductFormData) => {
        // Validación especial para isForSale e isInternalUse
        if (name === 'isForSale' || name === 'isInternalUse') {
            setFormData(prev => {
                const newData = { ...prev, [name]: checked };
                
                // Si se está desmarcando, verificar que el otro esté marcado
                if (!checked) {
                    const otherField = name === 'isForSale' ? 'isInternalUse' : 'isForSale';
                    if (!prev[otherField]) {
                        sonnerToast.error("El producto debe estar disponible para venta o uso interno");
                        return prev; // No permitir el cambio
                    }
                }
                
                return newData;
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: checked }));
        }
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Validaciones más robustas
        if (!formData.name) {
            sonnerToast.error("El nombre es obligatorio.");
            return;
        }
        
        // Validar que al menos isForSale o isInternalUse esté seleccionado
        if (!formData.isForSale && !formData.isInternalUse) {
            sonnerToast.error("El producto debe estar disponible para venta o uso interno");
            return;
        }
        
        // Transformar formData para que coincida con el schema de la API
        const dataToSubmit = {
            name: formData.name,
            description: null, // Por ahora no hay campo de descripción
            sku: formData.sku,
            barcode: formData.ean,
            price: parseFloat(formData.priceWithVat?.toString() || '0'),
            costPrice: parseFloat(formData.costPriceWithVat?.toString() || '0'),
            categoryId: formData.categoryId,
            vatTypeId: formData.vatTypeId,
            settings: {
                isActive: !formData.isDisabled,
                isForSale: formData.isForSale,
                isInternalUse: formData.isInternalUse,
                currentStock: 0, // Valor por defecto
                minStockThreshold: null, // Valor por defecto
                pointsAwarded: 0, // Valor por defecto - NO puede ser null
            }
        };
        
        onSubmit(dataToSubmit); // Llamar a la función onSubmit pasada por props
    };

    return (
        <form id="product-form" onSubmit={handleSubmitForm}>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Datos del producto</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            {/* Nombre */}
                            <div>
                                <Label htmlFor="name">Nombre</Label>
                                <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} required />
                            </div>
                            {/* Familia */}
                            <div>
                                <Label htmlFor="categoryId">Familia</Label>
                                <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCategoryCombobox}
                                            className="w-full justify-between"
                                        >
                                            {formData.categoryId
                                                ? categories.find(cat => cat.id === formData.categoryId)?.name
                                                : "(Ninguna)"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar familia..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron familias.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value=""
                                                        onSelect={() => {
                                                            handleSelectChange("", 'categoryId');
                                                            setOpenCategoryCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                !formData.categoryId ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        (Ninguna)
                                                    </CommandItem>
                                                    {categories.map((cat) => (
                                                        <CommandItem
                                                            key={cat.id}
                                                            value={cat.name}
                                                            onSelect={() => {
                                                                handleSelectChange(cat.id, 'categoryId');
                                                                setOpenCategoryCombobox(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.categoryId === cat.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {cat.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {/* Precio con IVA */}
                             <div>
                                <Label htmlFor="priceWithVat">Precio con IVA</Label>
                                <Input id="priceWithVat" name="priceWithVat" type="number" step="0.01" value={formData.priceWithVat || ''} onChange={handleInputChange} />
                            </div>
                             {/* IVA */}
                            <div>
                                <Label htmlFor="vatTypeId">IVA</Label>
                                <Popover open={openVatCombobox} onOpenChange={setOpenVatCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openVatCombobox}
                                            className={cn(
                                                "w-full justify-between",
                                                !formData.vatTypeId && "text-muted-foreground"
                                            )}
                                        >
                                            {formData.vatTypeId
                                                ? vatTypes.find(vat => vat.id === formData.vatTypeId)?.name + 
                                                  " (" + vatTypes.find(vat => vat.id === formData.vatTypeId)?.rate.toFixed(2) + "%)"
                                                : "Seleccionar tipo IVA..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar tipo IVA..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró ningún tipo de IVA.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem 
                                                        value="Sin IVA" 
                                                        onSelect={() => { 
                                                            handleSelectChange("", 'vatTypeId'); 
                                                            setOpenVatCombobox(false); 
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", !formData.vatTypeId ? "opacity-100" : "opacity-0")} />
                                                        Sin IVA
                                                    </CommandItem>
                                                    {vatTypes.map((vat) => (
                                                        <CommandItem 
                                                            key={vat.id} 
                                                            value={vat.name} 
                                                            onSelect={() => { 
                                                                handleSelectChange(vat.id, 'vatTypeId'); 
                                                                setOpenVatCombobox(false); 
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", formData.vatTypeId === vat.id ? "opacity-100" : "opacity-0")} />
                                                            {vat.name} ({vat.rate.toFixed(2)}%)
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {/* Tarifa Plana */}
                            <div>
                                <Label htmlFor="belongsToFlatRate">Pertenece a la tarifa plana</Label>
                                {/* TODO: Cargar y mostrar tarifas planas */} 
                                <Select 
                                    name="belongsToFlatRate" 
                                    value={formData.belongsToFlatRate || ''}
                                    onValueChange={(v) => handleSelectChange(v, 'belongsToFlatRate')}
                                    disabled
                                >
                                    <SelectTrigger><SelectValue placeholder="(Ninguna)" /></SelectTrigger>
                                    <SelectContent>
                                    </SelectContent>
                                </Select>
                            </div>
                             {/* Consume / Tipo Consumo (Placeholder) */} 
                             <div className='flex gap-2'>
                                <div className='flex-1'>
                                    <Label htmlFor="consumptionUnits">Consume</Label>
                                    <Input id="consumptionUnits" name="consumptionUnits" type="number" value={formData.consumptionUnits || ''} onChange={handleInputChange} />
                                </div>
                                <div className='flex-1'>
                                    <Label htmlFor="consumptionType">Tipo de consumo</Label>
                                     {/* TODO: Cargar y mostrar tipos */} 
                                    <Select 
                                        name="consumptionType" 
                                        value={formData.consumptionType || ''}
                                        onValueChange={(v) => handleSelectChange(v, 'consumptionType')}
                                        disabled
                                    >
                                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                         <SelectContent>
                                         </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </div>
                        
                        {/* Columna 2 */}
                         <div className="space-y-4">
                            {/* Precio Compra con IVA */} 
                            <div>
                                <Label htmlFor="costPriceWithVat">Precio de compra con IVA</Label>
                                <Input id="costPriceWithVat" name="costPriceWithVat" type="number" step="0.01" value={formData.costPriceWithVat || ''} onChange={handleInputChange} />
                            </div>
                            {/* IVA Compra */} 
                             <div>
                                <Label htmlFor="purchaseVatTypeId">IVA Compra</Label>
                                <Popover open={openPurchaseVatCombobox} onOpenChange={setOpenPurchaseVatCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openPurchaseVatCombobox}
                                            className={cn(
                                                "w-full justify-between",
                                                !formData.purchaseVatTypeId && "text-muted-foreground"
                                            )}
                                        >
                                            {formData.purchaseVatTypeId
                                                ? vatTypes.find(vat => vat.id === formData.purchaseVatTypeId)?.name + 
                                                  " (" + vatTypes.find(vat => vat.id === formData.purchaseVatTypeId)?.rate.toFixed(2) + "%)"
                                                : "Seleccionar tipo IVA..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar tipo IVA..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró ningún tipo de IVA.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem 
                                                        value="Sin IVA" 
                                                        onSelect={() => { 
                                                            handleSelectChange("", 'purchaseVatTypeId'); 
                                                            setOpenPurchaseVatCombobox(false); 
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", !formData.purchaseVatTypeId ? "opacity-100" : "opacity-0")} />
                                                        Sin IVA
                                                    </CommandItem>
                                                    {vatTypes.map((vat) => (
                                                        <CommandItem 
                                                            key={vat.id} 
                                                            value={vat.name} 
                                                            onSelect={() => { 
                                                                handleSelectChange(vat.id, 'purchaseVatTypeId'); 
                                                                setOpenPurchaseVatCombobox(false); 
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", formData.purchaseVatTypeId === vat.id ? "opacity-100" : "opacity-0")} />
                                                            {vat.name} ({vat.rate.toFixed(2)}%)
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {/* EAN */} 
                             <div>
                                <Label htmlFor="ean">EAN</Label>
                                <Input id="ean" name="ean" value={formData.ean || ''} onChange={handleInputChange} />
                            </div>
                            {/* SKU */} 
                            <div>
                                <Label htmlFor="sku">SKU</Label>
                                <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleInputChange} />
                             </div>
                            {/* Comisión (Condicional) */} 
                             <div>
                                 <Label htmlFor="commissionType">Tipo de comisión</Label>
                                 <Select name="commissionType" value={formData.commissionType || 'Global'} onValueChange={(v) => handleSelectChange(v as ProductFormData['commissionType'], 'commissionType')}>
                                     <SelectTrigger><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="Global">Global</SelectItem>
                                         <SelectItem value="Percentage">Porcentaje</SelectItem>
                                         <SelectItem value="Fixed">Importe fijo</SelectItem>
                                     </SelectContent>
                                 </Select>
                                 {formData.commissionType && formData.commissionType !== 'Global' && (
                                     <div className="mt-2">
                                         <Label htmlFor="commissionValue">{formData.commissionType === 'Percentage' ? 'Porcentaje' : 'Importe'}</Label>
                                         <Input 
                                            id="commissionValue"
                                            name="commissionValue"
                                            type="number"
                                            step={formData.commissionType === 'Percentage' ? '0.01' : '0.01'}
                                            min="0"
                                            value={formData.commissionValue || ''}
                                            onChange={handleInputChange}
                                         />
                                     </div>
                                 )}
                             </div>
                        </div>
                        
                        {/* Columna 3 (Checkboxes) */} 
                         <div className="space-y-2 pt-6"> {/* Añadir padding top para alinear mejor */} 
                            <div className="flex items-center space-x-2">
                                <Checkbox id="isForSale" name="isForSale" checked={formData.isForSale} onCheckedChange={(c) => handleCheckboxChange(!!c, 'isForSale')} />
                                <Label htmlFor="isForSale">Está a la venta</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="isInternalUse" name="isInternalUse" checked={formData.isInternalUse} onCheckedChange={(c) => handleCheckboxChange(!!c, 'isInternalUse')} />
                                <Label htmlFor="isInternalUse">Uso interno</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="automaticDiscounts" name="automaticDiscounts" checked={formData.automaticDiscounts} onCheckedChange={(c) => handleCheckboxChange(!!c, 'automaticDiscounts')} />
                                <Label htmlFor="automaticDiscounts">Descuentos automáticos</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="manualDiscounts" name="manualDiscounts" checked={formData.manualDiscounts} onCheckedChange={(c) => handleCheckboxChange(!!c, 'manualDiscounts')} />
                                <Label htmlFor="manualDiscounts">Descuentos manuales</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="acceptsPromotions" name="acceptsPromotions" checked={formData.acceptsPromotions} onCheckedChange={(c) => handleCheckboxChange(!!c, 'acceptsPromotions')} />
                                <Label htmlFor="acceptsPromotions">Acepta promociones</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                    <Checkbox id="affectsStatistics" name="affectsStatistics" checked={formData.affectsStatistics} onCheckedChange={(c) => handleCheckboxChange(!!c, 'affectsStatistics')} />
                                    <Label htmlFor="affectsStatistics">
                                        Afecta estadísticas
                                    </Label>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="requiresLotReference" name="requiresLotReference" checked={formData.requiresLotReference} onCheckedChange={(c) => handleCheckboxChange(!!c, 'requiresLotReference')} />
                                <Label htmlFor="requiresLotReference">Requiere referencia del lote y fecha de caducidad</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="isDisabled" name="isDisabled" checked={formData.isDisabled} onCheckedChange={(c) => handleCheckboxChange(!!c, 'isDisabled')} />
                                <Label htmlFor="isDisabled">Deshabilitado</Label>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 {/* Placeholder para Archivo de Ayuda */}
                <div className="flex items-center gap-4">
                    <Label className="w-24 text-right">Archivo De Ayuda</Label>
                    <Input className="flex-1" placeholder="Nombre" />
                    <Button variant="default" type="button" disabled>(Ninguno)</Button> {/* Botón para seleccionar archivo? */}
                </div>

                {/* Botones Puntos/Bonos/Suscripciones (se mostrarán debajo o en Tabs?) */}
                {/* Esta parte se añadirá después */}

            </div>
            
             {/* Botones fijos Guardar/Volver/Ayuda - Se manejarán en la página contenedora */}
            {/* 
            <div className="fixed bottom-0 right-0 p-4 bg-white border-t w-full flex justify-end space-x-2"> 
                 <Button variant="outline" type="button" onClick={() => router.back()}>Volver</Button>
                 <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
                 <Button variant="secondary" type="button">Ayuda</Button>
             </div>
             */}
        </form>
    );
} 