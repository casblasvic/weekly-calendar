/* eslint-disable react/no-unescaped-entities */
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Añadir Textarea si se usa
import { Minus, Plus, AlertCircle, AlertTriangle, Save, XCircle, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, VATType, Equipment } from '@prisma/client'; // Asumiendo estos tipos
import { toast } from "sonner"; // Usar sonner
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Definir la estructura de datos esperada para el servicio
export interface ServiceFormData {
    id?: string; // Opcional, solo presente en edición
    name: string;
    code: string;
    categoryId: string;
    defaultVatId: string | null; // IVA por defecto GLOBAL
    duration: number;
    color?: string | null; // Color en agenda (podría ser string directo o ID)
    basePrice: number | null; // Precio base GLOBAL (IVA excluido?)
    equipmentId: string | null;
    commissionType?: string | null; // O un enum
    commissionValue?: number | null;
    requiresParams?: boolean;
    isValuationVisit?: boolean;
    showInApp?: boolean;
    allowAutomaticDiscounts?: boolean;
    allowManualDiscounts?: boolean;
    acceptsPromotions?: boolean;
    allowPvpEditing?: boolean;
    affectsStatistics?: boolean;
    isActive?: boolean;
    // Campos que NO estarán aquí (se manejan en otras secciones):
    // - Imágenes
    // - Documentos
    // - Puntos
    // - Bonos asociados
    // - Recursos específicos
    // - Parámetros avanzados específicos
}

interface ServiceFormProps {
    initialData?: ServiceFormData | null; // Datos iniciales para edición
    categories: Category[];
    vatTypes: VATType[];
    equipments: Equipment[]; // Equipos disponibles globalmente
    onSubmit: (data: ServiceFormData) => Promise<void>; // Función para guardar
    isSaving?: boolean;
    formId?: string; // Para vincular botón externo
}

// Colores de ejemplo (ajustar según tu sistema real)
const coloresAgenda = [
    { id: 'blue', nombre: 'Azul', clase: 'bg-blue-500' },
    { id: 'green', nombre: 'Verde', clase: 'bg-green-500' },
    { id: 'red', nombre: 'Rojo', clase: 'bg-red-500' },
    { id: 'purple', nombre: 'Púrpura', clase: 'bg-purple-500' },
    { id: 'yellow', nombre: 'Amarillo', clase: 'bg-yellow-500' },
    { id: 'indigo', nombre: 'Índigo', clase: 'bg-indigo-500' },
];

// Tipos de comisión de ejemplo
const tiposComision = [
    { id: 'percentage', nombre: 'Porcentaje (%)' },
    { id: 'fixed', nombre: 'Importe Fijo (€)' },
];

// Estilos para inputs/selects (mantener consistencia)
const inputHoverClass = "hover:border-purple-300 focus:border-purple-500 focus:ring-purple-500";

export const ServiceForm: React.FC<ServiceFormProps> = ({
    initialData,
    categories,
    vatTypes,
    equipments,
    onSubmit,
    isSaving = false,
    formId = "service-form",
}) => {
    const [formData, setFormData] = useState<ServiceFormData>(() => {
        // Inicializar con datos o valores por defecto
        return initialData || {
            name: '',
            code: '',
            categoryId: '',
            defaultVatId: null,
            duration: 30,
            color: null,
            basePrice: null,
            equipmentId: null,
            commissionType: null,
            commissionValue: null,
            requiresParams: false,
            isValuationVisit: false,
            showInApp: true,
            allowAutomaticDiscounts: true,
            allowManualDiscounts: true,
            acceptsPromotions: true,
            allowPvpEditing: false,
            affectsStatistics: true,
            isActive: true,
        };
    });

    const [showPriceConfirmationModal, setShowPriceConfirmationModal] = useState(false);
    const [showMandatoryFieldsModal, setShowMandatoryFieldsModal] = useState(false);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [familiaPopoverOpen, setFamiliaPopoverOpen] = useState(false);
    const [ivaPopoverOpen, setIvaPopoverOpen] = useState(false);
    const [equipoPopoverOpen, setEquipoPopoverOpen] = useState(false);
    const [comisionPopoverOpen, setComisionPopoverOpen] = useState(false);
    const [colorPopoverOpen, setColorPopoverOpen] = useState(false);

    const serviceId = initialData?.id;
    const isEditMode = !!serviceId;

    // Detectar cambios para habilitar el guardado
    useEffect(() => {
        if (initialData) {
            setIsDirty(JSON.stringify(initialData) !== JSON.stringify(formData));
        } else {
             // Si es nuevo, cualquier cambio lo marca como dirty si tiene nombre y código
            setIsDirty(!!formData.name || !!formData.code); 
        }
    }, [formData, initialData]);

    // --- Handlers --- 
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: keyof ServiceFormData, value: string | null) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (name: keyof ServiceFormData, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Permitir campo vacío o números/decimales
        if (value === '' || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNumericInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let numValue: number | null = parseFloat(value.replace(',', '.'));
        if (isNaN(numValue)) {
            numValue = null; // O 0 según prefieras
        }
        setFormData(prev => ({ ...prev, [name]: numValue }));
    };

    const handleDurationChange = (increment: number) => {
        setFormData(prev => ({
            ...prev,
            duration: Math.max(1, (prev.duration || 0) + increment)
        }));
    };

    // --- Validación --- 
    const validateForm = (): string[] => {
        const missing: string[] = [];
        if (!formData.name?.trim()) missing.push("Nombre del Servicio");
        if (!formData.code?.trim()) missing.push("Código");
        if (!formData.categoryId) missing.push("Familia");
        if (formData.duration === undefined || formData.duration === null || formData.duration <= 0) missing.push("Duración (minutos)");
        if (formData.defaultVatId === undefined) missing.push("Tipo de IVA"); // Puede ser null, pero debe estar definido
        // Quitar validación de precio aquí, se hace antes de guardar
        // if (formData.basePrice === undefined) missing.push("Precio Venta"); // Puede ser null
        
        // Añadir otras validaciones si son necesarias
        return missing;
    };

    // --- Guardado --- 
    const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        console.log("Intentando guardar formulario con datos:", formData);

        const missing = validateForm();
        if (missing.length > 0) {
            setMissingFields(missing);
            setShowMandatoryFieldsModal(true);
            return;
        }

        // Validar lógica Precio/IVA
        const price = formData.basePrice;
        const hasPrice = typeof price === 'number' && price > 0;
        const hasVat = formData.defaultVatId !== null && formData.defaultVatId !== undefined;

        if (hasPrice && !hasVat) {
            setMissingFields(["Tipo de IVA (obligatorio si precio > 0)"]);
            setShowMandatoryFieldsModal(true);
            return;
        }

        if (!hasPrice) {
            // Si no tiene precio, mostrar modal de confirmación
            setShowPriceConfirmationModal(true);
            return; // Esperar confirmación del modal
        }
        
        // Si tiene precio y tiene IVA (o no tiene precio y ya se confirmó), guardar directamente
        await proceedToSave();
    };

    const proceedToSave = async () => {
        setShowPriceConfirmationModal(false); // Cerrar modal si estaba abierto
        // Crear el objeto final a enviar, asegurando tipos correctos
        const dataToSend: ServiceFormData = {
            ...formData,
            duration: Number(formData.duration) || 1,
            basePrice: formData.basePrice !== null ? Number(formData.basePrice) : null,
            commissionValue: formData.commissionValue !== null ? Number(formData.commissionValue) : null,
            // Asegurar booleanos
            requiresParams: !!formData.requiresParams,
            isValuationVisit: !!formData.isValuationVisit,
            showInApp: !!formData.showInApp,
            allowAutomaticDiscounts: !!formData.allowAutomaticDiscounts,
            allowManualDiscounts: !!formData.allowManualDiscounts,
            acceptsPromotions: !!formData.acceptsPromotions,
            allowPvpEditing: !!formData.allowPvpEditing,
            affectsStatistics: !!formData.affectsStatistics,
            isActive: !!formData.isActive,
        };
        console.log("Datos finales a enviar:", dataToSend);
        try {
           await onSubmit(dataToSend); 
           // Limpiar dirty state si onSubmit fue exitoso (asumiendo que la página padre recarga)
           // La página padre mostrará el toast de éxito/error
           if(!initialData) { // Si era nuevo, limpiar formulario
              // setFormData({...valoresPorDefecto...}) // Opcional: limpiar form si es nuevo
           }
           setIsDirty(false);
        } catch (error) {
            // onSubmit debería manejar los toasts de error
            console.error("Error en ServiceForm al llamar onSubmit:", error);
        }
    };

    return (
        <form id={formId} onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda (Formulario principal) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card Información Básica */}
                    <Card className="mb-6">
                        <CardContent className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold mb-4 text-purple-700">Información Básica</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Nombre del Servicio *</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required className={inputHoverClass} />
                                </div>
                                <div>
                                    <Label htmlFor="code">Código *</Label>
                                    <Input id="code" name="code" value={formData.code} onChange={handleInputChange} required className={inputHoverClass} />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="categoryId">Familia *</Label>
                                <Popover open={familiaPopoverOpen} onOpenChange={setFamiliaPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={familiaPopoverOpen}
                                            className={cn("w-full justify-between font-normal", inputHoverClass)}
                                        >
                                            {formData.categoryId
                                                ? categories.find((cat) => cat.id === formData.categoryId)?.name
                                                : "Selecciona una familia..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command 
                                            filter={(value, search) => { 
                                                // value es cat.id, search es lo escrito
                                                // Buscamos la categoría por ID y comparamos su nombre
                                                const categoryName = categories.find(c => c.id === value)?.name || "";
                                                return categoryName.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                                            }}
                                        >
                                            <CommandInput placeholder="Buscar familia..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron familias.</CommandEmpty>
                                                <CommandGroup>
                                                    {categories.map((cat) => (
                                                        <CommandItem
                                                            key={cat.id}
                                                            value={cat.id}
                                                            onSelect={(currentValue) => {
                                                                handleSelectChange('categoryId', currentValue === formData.categoryId ? null : currentValue);
                                                                setFamiliaPopoverOpen(false);
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
                            <div>
                                <Label htmlFor="defaultVatId">Tipo de IVA *</Label>
                                <Popover open={ivaPopoverOpen} onOpenChange={setIvaPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={ivaPopoverOpen}
                                            className={cn("w-full justify-between font-normal", inputHoverClass)}
                                        >
                                            {formData.defaultVatId
                                                ? vatTypes.find((vat) => vat.id === formData.defaultVatId)?.name + ` (${vatTypes.find((vat) => vat.id === formData.defaultVatId)?.rate}%)`
                                                : "Selecciona un tipo de IVA..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command 
                                            filter={(value, search) => {
                                                // value es vat.id o 'none'
                                                if (value === 'none') return "sin iva".includes(search.toLowerCase()) ? 1 : 0;
                                                const vatName = vatTypes.find(v => v.id === value)?.name || "";
                                                const vatRate = vatTypes.find(v => v.id === value)?.rate || "";
                                                const textToSearch = `${vatName} ${vatRate}%`.toLowerCase();
                                                return textToSearch.includes(search.toLowerCase()) ? 1 : 0;
                                            }}
                                        >
                                            <CommandInput placeholder="Buscar IVA..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontraron tipos de IVA.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        key="none"
                                                        value="none"
                                                        onSelect={() => {
                                                            handleSelectChange('defaultVatId', null);
                                                            setIvaPopoverOpen(false);
                                                        }}
                                                    >
                                                         <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.defaultVatId === null ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        Sin IVA
                                                    </CommandItem>
                                                    {vatTypes.map((vat) => (
                                                        <CommandItem
                                                            key={vat.id}
                                                            value={vat.id}
                                                            onSelect={(currentValue) => {
                                                                handleSelectChange('defaultVatId', currentValue === formData.defaultVatId ? null : currentValue);
                                                                setIvaPopoverOpen(false);
                                                            }}
                                                        >
                                                             <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.defaultVatId === vat.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {vat.name} ({vat.rate}%)
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card Configuración y Precios */}
                    <Card className="mb-6">
                        <CardContent className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold mb-4 text-purple-700">Configuración y Precios</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <div className="sm:col-span-1">
                                    <Label htmlFor="duration">Duración (minutos) *</Label>
                                    <div className="flex items-center mt-1">
                                        <Button type="button" variant="outline" size="icon" onClick={() => handleDurationChange(-1)} className="rounded-r-none h-10 w-10">
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            id="duration"
                                            name="duration"
                                            type="number"
                                            value={formData.duration || ''}
                                            onChange={handleInputChange} // Usar normal y validar en submit/blur
                                            min="1"
                                            step="1"
                                            required
                                            className={cn("w-20 text-center rounded-none h-10 hide-number-arrows", inputHoverClass)}
                                        />
                                        <Button type="button" variant="outline" size="icon" onClick={() => handleDurationChange(1)} className="rounded-l-none h-10 w-10">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="color">Color Agenda</Label>
                                    <Popover open={colorPopoverOpen} onOpenChange={setColorPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={colorPopoverOpen}
                                                className={cn("w-full justify-between font-normal", inputHoverClass)}
                                            >
                                                {formData.color ? (
                                                    <div className="flex items-center">
                                                        <span className={`w-4 h-4 rounded-full mr-2 ${coloresAgenda.find(c => c.id === formData.color)?.clase}`}></span>
                                                        {coloresAgenda.find(c => c.id === formData.color)?.nombre}
                                                    </div>
                                                ) : "Selecciona un color..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command
                                                filter={(value, search) => {
                                                    // value es color.id o ''
                                                    if (value === '') return "sin color".includes(search.toLowerCase()) ? 1 : 0;
                                                    const colorName = coloresAgenda.find(c => c.id === value)?.nombre || "";
                                                    return colorName.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                                                }}
                                            >
                                                <CommandInput placeholder="Buscar color..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron colores.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            key="placeholder"
                                                            value=""
                                                            onSelect={() => {
                                                                handleSelectChange('color', null);
                                                                setColorPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.color === null ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            Sin color específico
                                                        </CommandItem>
                                                        {coloresAgenda.map((color) => (
                                                            <CommandItem
                                                                key={color.id}
                                                                value={color.id}
                                                                onSelect={(currentValue) => {
                                                                    handleSelectChange('color', currentValue === formData.color ? null : currentValue);
                                                                    setColorPopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.color === color.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex items-center">
                                                                    <span className={`w-4 h-4 rounded-full mr-2 ${color.clase}`}></span>
                                                                    {color.nombre}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="basePrice">Precio Base (Sin IVA) *</Label>
                                    <Input
                                        id="basePrice"
                                        name="basePrice"
                                        type="text" // Usar text para manejo manual
                                        inputMode='decimal'
                                        value={formData.basePrice === null ? '' : String(formData.basePrice).replace('.', ',')} // Mostrar con coma
                                        onChange={handleNumericInputChange}
                                        onBlur={handleNumericInputBlur}
                                        placeholder="0,00"
                                        className={inputHoverClass}
                                        />
                                </div>
                                <div>
                                    <Label htmlFor="equipmentId">Equipo</Label>
                                    <Popover open={equipoPopoverOpen} onOpenChange={setEquipoPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={equipoPopoverOpen}
                                                className={cn("w-full justify-between font-normal", inputHoverClass)}
                                            >
                                                {formData.equipmentId
                                                    ? equipments.find((eq) => eq.id === formData.equipmentId)?.name
                                                    : "Selecciona un equipo (opcional)..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command
                                                filter={(value, search) => {
                                                    // value es eq.id o ''
                                                    if (value === '') return "sin equipo".includes(search.toLowerCase()) ? 1 : 0;
                                                    const equipmentName = equipments.find(e => e.id === value)?.name || "";
                                                    const equipmentSerial = equipments.find(e => e.id === value)?.serialNumber || "";
                                                    const textToSearch = `${equipmentName} ${equipmentSerial}`.toLowerCase();
                                                    return textToSearch.includes(search.toLowerCase()) ? 1 : 0;
                                                }}
                                            >
                                                <CommandInput placeholder="Buscar equipo..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron equipos.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            key="placeholder"
                                                            value=""
                                                            onSelect={() => {
                                                                handleSelectChange('equipmentId', null);
                                                                setEquipoPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.equipmentId === null ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            Sin equipo específico
                                                        </CommandItem>
                                                        {equipments.map((eq) => (
                                                            <CommandItem
                                                                key={eq.id}
                                                                value={eq.id}
                                                                onSelect={(currentValue) => {
                                                                    handleSelectChange('equipmentId', currentValue === formData.equipmentId ? null : currentValue);
                                                                    setEquipoPopoverOpen(false);
                                                                }}
                                                            >
                                                                 <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.equipmentId === eq.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                 {eq.name}{eq.serialNumber ? ` (${eq.serialNumber})` : ''}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="commissionType">Tipo Comisión</Label>
                                    <Popover open={comisionPopoverOpen} onOpenChange={setComisionPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={comisionPopoverOpen}
                                                className={cn("w-full justify-between font-normal", inputHoverClass)}
                                            >
                                                {formData.commissionType
                                                    ? tiposComision.find((t) => t.id === formData.commissionType)?.nombre
                                                    : "Selecciona tipo comisión..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command
                                                filter={(value, search) => {
                                                    // value es tipo.id o ''
                                                    if (value === '') return "sin comision".includes(search.toLowerCase()) ? 1 : 0;
                                                    const commissionName = tiposComision.find(t => t.id === value)?.nombre || "";
                                                    return commissionName.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                                                }}
                                            >
                                                <CommandInput placeholder="Buscar tipo..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron tipos.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            key="placeholder"
                                                            value=""
                                                            onSelect={() => {
                                                                handleSelectChange('commissionType', null);
                                                                setComisionPopoverOpen(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    formData.commissionType === null ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            Sin comisión
                                                        </CommandItem>
                                                        {tiposComision.map((tipo) => (
                                                            <CommandItem
                                                                key={tipo.id}
                                                                value={tipo.id}
                                                                onSelect={(currentValue) => {
                                                                    handleSelectChange('commissionType', currentValue === formData.commissionType ? null : currentValue);
                                                                    setComisionPopoverOpen(false);
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.commissionType === tipo.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {tipo.nombre}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <Label htmlFor="commissionValue">Comisión</Label>
                                    <Input
                                         id="commissionValue"
                                         name="commissionValue"
                                         type="text"
                                         inputMode='decimal'
                                         value={formData.commissionValue === null ? '' : String(formData.commissionValue).replace('.', ',')}
                                         onChange={handleNumericInputChange}
                                         onBlur={handleNumericInputBlur}
                                         placeholder="0,00"
                                         className={inputHoverClass}
                                         disabled={!formData.commissionType} // Deshabilitar si no hay tipo
                                     />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha (Opciones avanzadas, Fotos, Documentos) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Sección Fotos (Placeholder - Restaurado) */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Fotos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-muted-foreground/50 rounded-md p-6 text-center mb-4 cursor-not-allowed hover:border-primary/50">
                                <p className="text-sm text-muted-foreground">Arrastra fotos aquí o haz clic para subir.</p>
                                <p className="text-xs text-muted-foreground mt-1">La primera foto será la principal.</p>
                                {!isEditMode && <p className="text-xs text-amber-600 mt-2">(Guarda primero el servicio)</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 min-h-[20px]">
                                {/* Aquí aparecerían las píldoras de fotos */} 
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">Gestión de fotos pendiente de implementación.</p>
                        </CardContent>
                    </Card>

                    {/* Sección Documentos (Placeholder - Restaurado) */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Documentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="border-2 border-dashed border-muted-foreground/50 rounded-md p-4 text-center mb-4 cursor-not-allowed hover:border-primary/50">
                                <p className="text-sm text-muted-foreground">Arrastra documentos aquí o haz clic para subir.</p>
                                {!isEditMode && <p className="text-xs text-amber-600 mt-2">(Guarda primero el servicio)</p>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 min-h-[20px]">
                                {/* Aquí aparecerían las píldoras de documentos */} 
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">Gestión de documentos pendiente de implementación.</p>
                        </CardContent>
                    </Card>

                    {/* Card Opciones Avanzadas - EXISTENTE */}
                    <Card className="mb-6">
                        <CardContent className="p-6 space-y-4">
                            <h2 className="text-lg font-semibold mb-4 text-purple-700">Opciones Avanzadas</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Mapear checkboxes */}
                                {
                                    [ // Array de configuración para checkboxes
                                        { id: 'requiresParams', label: 'Requiere Parámetros', field: 'requiresParams' },
                                        { id: 'isValuationVisit', label: 'Visita de Valoración', field: 'isValuationVisit' },
                                        { id: 'showInApp', label: 'Aparece en APP/WEB', field: 'showInApp' },
                                        { id: 'allowAutomaticDiscounts', label: 'Permite Desc. Automáticos', field: 'allowAutomaticDiscounts' },
                                        { id: 'allowManualDiscounts', label: 'Permite Desc. Manuales', field: 'allowManualDiscounts' },
                                        { id: 'acceptsPromotions', label: 'Acepta Promociones', field: 'acceptsPromotions' },
                                        { id: 'allowPvpEditing', label: 'Permite Editar PVP', field: 'allowPvpEditing' },
                                        { id: 'affectsStatistics', label: 'Afecta Estadísticas', field: 'affectsStatistics' },
                                        { id: 'isActive', label: 'Servicio Activo', field: 'isActive', isPrimary: true },
                                    ].map(cb => (
                                        <div key={cb.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={cb.id} 
                                                checked={!!formData[cb.field as keyof ServiceFormData]} 
                                                onCheckedChange={(checked) => handleCheckboxChange(cb.field as keyof ServiceFormData, !!checked)} 
                                            />
                                            <Label htmlFor={cb.id} className={cn("text-sm font-medium", cb.field === 'isActive' && !formData.isActive ? 'text-red-600' : '')}>
                                                {cb.label}
                                            </Label>
                                        </div>
                                    ))
                                }
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* Botón de submit oculto para que funcione el formId externo */} 
            <button type="submit" hidden disabled={isSaving || !isDirty}>Submit</button>

            {/* --- Modales --- */}
             {/* Modal Campos Obligatorios */} 
            <Dialog open={showMandatoryFieldsModal} onOpenChange={setShowMandatoryFieldsModal}>
                <DialogContent className="sm:max-w-md border">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="flex items-center">
                            <AlertCircle className="text-red-500 mr-2" />
                            Campos Obligatorios Faltantes
                        </DialogTitle>
                    </DialogHeader>
                     <DialogDescription className="py-4">
                        Por favor, completa los siguientes campos antes de guardar:
                        <ul className="list-disc list-inside mt-2 text-red-600">
                            {missingFields.map((field, index) => (
                                <li key={index}>{field}</li>
                            ))}
                        </ul>
                    </DialogDescription>
                    <DialogFooter className="pt-4">
                         <Button variant="outline" onClick={() => setShowMandatoryFieldsModal(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Confirmación Guardar sin Precio/IVA */}
            <Dialog open={showPriceConfirmationModal} onOpenChange={setShowPriceConfirmationModal}>
                <DialogContent className="sm:max-w-md border">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="flex items-center">
                            <AlertTriangle className="text-yellow-500 mr-2" />
                            Confirmar Guardado
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="py-4 text-center">
                         El servicio se guardará sin precio indicado. ¿Deseas continuar?
                    </DialogDescription>
                    <DialogFooter className="sm:justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setShowPriceConfirmationModal(false)}>Cancelar</Button>
                        <Button onClick={proceedToSave} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}; 