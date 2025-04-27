"use client"

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Category, VATType } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast as sonnerToast } from "sonner";
import { HelpCircle } from 'lucide-react'; // Para el icono de ayuda
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Tipo ampliado para el producto que puede venir con relaciones
type ProductWithRelations = Product & {
    category?: Category | null;
    vatType?: VATType | null;
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
    automaticDiscounts: boolean;
    manualDiscounts: boolean;
    acceptsPromotions: boolean;
    affectsStatistics: boolean;
    requiresLotReference: boolean;
    isDisabled: boolean; // Mapea a !isActive?
}

export function ProductForm({ initialData, isSaving, onSubmit }: ProductFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState<Partial<ProductFormData>>({}); // Usar Partial para inicializar
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    // TODO: Cargar otros datos necesarios (tipos de comisión, tarifas planas, tipos de consumo?)
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

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
            // ¡Esta parte es compleja y requiere conocer cómo se calculan/almacenan los precios con IVA!
            // Asumiremos valores directos por ahora, pero necesita revisión.
            setFormData({
                name: initialData.name,
                categoryId: initialData.categoryId,
                priceWithVat: initialData.price?.toString() ?? '', // ¡Necesita cálculo inverso o campo específico!
                vatTypeId: initialData.vatTypeId,
                // ... mapear otros campos ...
                ean: initialData.barcode, // Asumiendo que EAN es barcode
                sku: initialData.sku,
                isForSale: initialData.isForSale,
                isDisabled: !initialData.isActive,
                // ... completar mapeo ...
                 commissionType: 'Global', // Valor por defecto inicial
                 commissionValue: null,
                 automaticDiscounts: false, // Valores por defecto
                 manualDiscounts: true,
                 acceptsPromotions: true,
                 affectsStatistics: true,
                 requiresLotReference: false,
            });
        } else {
            // Valores por defecto para nuevo producto
            setFormData({
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
                automaticDiscounts: false,
                manualDiscounts: true,
                acceptsPromotions: true,
                affectsStatistics: true,
                requiresLotReference: false,
                isDisabled: false,
            });
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
         setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmitForm = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Validaciones más robustas
        if (!formData.name) {
            sonnerToast.error("El nombre es obligatorio.");
            return;
        }
        
        // TODO: Transformar formData (ej: calcular precios base desde precios con IVA)
        // antes de llamar a onSubmit. Esto es crucial.
        const dataToSubmit = {
             ...formData, 
             isActive: !formData.isDisabled, // Mapear isDisabled a isActive
             price: parseFloat(formData.priceWithVat?.toString() || '0'), // ¡Cálculo incorrecto! Necesita lógica de IVA
             costPrice: parseFloat(formData.costPriceWithVat?.toString() || '0'), // ¡Cálculo incorrecto!
             barcode: formData.ean,
             // ... asegurar que todos los campos coinciden con el API
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
                                <Select name="categoryId" value={formData.categoryId ?? undefined} onValueChange={(v) => handleSelectChange(v, 'categoryId')}>
                                    <SelectTrigger><SelectValue placeholder="(Ninguna)" /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Precio con IVA */}
                             <div>
                                <Label htmlFor="priceWithVat">Precio con IVA</Label>
                                <Input id="priceWithVat" name="priceWithVat" type="number" step="0.01" value={formData.priceWithVat || ''} onChange={handleInputChange} />
                            </div>
                             {/* IVA */}
                            <div>
                                <Label htmlFor="vatTypeId">IVA</Label>
                                <Select name="vatTypeId" value={formData.vatTypeId ?? undefined} onValueChange={(v) => handleSelectChange(v, 'vatTypeId')}>
                                    <SelectTrigger><SelectValue placeholder="(Ninguno)" /></SelectTrigger>
                                    <SelectContent>
                                        {vatTypes.map(vat => <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Tarifa Plana */}
                            <div>
                                <Label htmlFor="belongsToFlatRate">Pertenece a la tarifa plana</Label>
                                {/* TODO: Cargar y mostrar tarifas planas */} 
                                <Select name="belongsToFlatRate" value={formData.belongsToFlatRate ?? undefined} onValueChange={(v) => handleSelectChange(v, 'belongsToFlatRate')} disabled>
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
                                    <Select name="consumptionType" value={formData.consumptionType ?? undefined} onValueChange={(v) => handleSelectChange(v, 'consumptionType')} disabled>
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
                                <Select name="purchaseVatTypeId" value={formData.purchaseVatTypeId ?? undefined} onValueChange={(v) => handleSelectChange(v, 'purchaseVatTypeId')}>
                                     <SelectTrigger><SelectValue placeholder="(Ninguno)" /></SelectTrigger>
                                     <SelectContent>
                                         {vatTypes.map(vat => <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>)}
                                     </SelectContent>
                                 </Select>
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