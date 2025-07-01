/* eslint-disable react/no-unescaped-entities */
"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Añadir Textarea si se usa
import { Minus, Plus, AlertCircle, AlertTriangle, Save, XCircle, Check, ChevronsUpDown, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, VATType, Equipment } from '@prisma/client'; // Asumiendo estos tipos
import { toast } from "sonner"; // Usar sonner

// ✅ NUEVO: Tipo extendido para categorías con equipmentType
type CategoryWithEquipment = Category & {
  equipmentType?: {
    id: string;
    name: string;
    description?: string;
  } | null;
};
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
    categories: CategoryWithEquipment[]; // ✅ NUEVO: Usar tipo extendido
    vatTypes: VATType[];
    equipments: Equipment[]; // Equipos disponibles globalmente
    onSubmit: (data: ServiceFormData) => Promise<void>; // Función para guardar
    isSaving?: boolean;
    formId?: string; // Para vincular botón externo
}

// ✅ ELIMINADO: Código legacy de colores hardcodeados
// Ahora usamos el componente ColorPicker reutilizable

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
    // ✅ ELIMINADO: colorPopoverOpen (ya no se usa con ColorPicker)

    // ✅ NUEVO: Estados para herencia de equipamiento
    const [inheritedEquipmentId, setInheritedEquipmentId] = useState<string | null>(null);
    const [isEquipmentInherited, setIsEquipmentInherited] = useState(false);

    const serviceId = initialData?.id;
    const isEditMode = !!serviceId;

    // ✅ NUEVO: Función para calcular herencia de equipamiento
    const calculateInheritedEquipment = (categoryId: string | null): string | null => {
        if (!categoryId || !categories.length) return null;
        
        // Buscar categoría en la jerarquía
        let currentCategory = categories.find(c => c.id === categoryId);
        while (currentCategory) {
            if (currentCategory.equipmentType?.id) {
                return currentCategory.equipmentType.id;
            }
            // Buscar categoría padre
            currentCategory = categories.find(c => c.id === currentCategory?.parentId);
        }
        return null;
    };

    // ✅ NUEVO: useEffect para herencia cuando cambia la categoría
    useEffect(() => {
        if (formData.categoryId) {
            const inherited = calculateInheritedEquipment(formData.categoryId);
            setInheritedEquipmentId(inherited);
            
            // Si no tiene equipamiento propio y hay herencia, auto-completar
            if (!formData.equipmentId && inherited) {
                setFormData(prev => ({ ...prev, equipmentId: inherited }));
                setIsEquipmentInherited(true);
            } else if (formData.equipmentId === inherited) {
                setIsEquipmentInherited(true);
            } else {
                setIsEquipmentInherited(false);
            }
        } else {
            setInheritedEquipmentId(null);
            setIsEquipmentInherited(false);
        }
    }, [formData.categoryId, categories]);

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
        console.log(`🔄 [ServiceForm] Cambiando ${name}:`, value); // ✅ DEBUG
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // ✅ NUEVO: Si cambian el equipamiento manualmente, marcar como no heredado
        if (name === 'equipmentId') {
            setIsEquipmentInherited(value === inheritedEquipmentId);
        }
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

    // Función auxiliar para renderizar campos de checkbox
    const renderCheckboxField = (id: keyof ServiceFormData, label: string) => (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={id}
                checked={formData[id] as boolean | undefined}
                onCheckedChange={(checked) => handleCheckboxChange(id, !!checked)} // Asegurar boolean
                disabled={isSaving}
            />
            <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
                {label}
            </Label>
        </div>
    );

    return (
        <form id={formId} onSubmit={handleSubmit} className="space-y-6">
            {/* --- MODIFICACIÓN: Volver a layout de 2 columnas --- */}
            {/* Contenedor principal vuelve a ser grid lg:grid-cols-3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Columna Izquierda (lg:col-span-2) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card: Datos Generales */}
                    <Card className="shadow-sm transition-all duration-300 overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Datos Generales</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Nombre Servicio <span className="text-red-500">*</span></Label>
                                    <Input id="name" name="name" placeholder="Ej: Masaje Relajante Espalda" value={formData.name} onChange={handleInputChange} className={cn(inputHoverClass)} disabled={isSaving} maxLength={100} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="code">Código <span className="text-red-500">*</span></Label>
                                    <Input id="code" name="code" placeholder="Ej: MAS-REL-01" value={formData.code} onChange={handleInputChange} className={cn(inputHoverClass)} disabled={isSaving} maxLength={20} />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Familia <span className="text-red-500">*</span></Label>
                                <Popover open={familiaPopoverOpen} onOpenChange={setFamiliaPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" aria-expanded={familiaPopoverOpen} className={cn("w-full justify-between", inputHoverClass, !formData.categoryId && "text-muted-foreground")} disabled={isSaving}>
                                            {formData.categoryId ? categories.find((cat) => cat.id === formData.categoryId)?.name : "Seleccionar familia..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                        <Command>
                                            <CommandInput placeholder="Buscar familia..." />
                                            <CommandList>
                                                <CommandEmpty>No se encontró ninguna familia.</CommandEmpty>
                                                <CommandGroup>
                                                    {categories.map((cat) => (
                                                        <CommandItem 
                                                            key={cat.id} 
                                                            value={cat.name} 
                                                            onSelect={() => { 
                                                                handleSelectChange("categoryId", cat.id); 
                                                                setFamiliaPopoverOpen(false); 
                                                            }}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", formData.categoryId === cat.id ? "opacity-100" : "opacity-0")} />
                                                            {cat.name}
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

                    {/* Card: Precios, IVA y Duración */}
                    <Card className="shadow-sm transition-all duration-300 overflow-hidden">
                         <CardHeader className="pb-4">
                            <CardTitle className="text-xl">Precios, IVA y Duración</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <Label htmlFor="basePrice">Precio Venta (€)</Label>
                                    <Input id="basePrice" name="basePrice" type="text" inputMode="decimal" placeholder="0,00" value={formData.basePrice === null ? '' : String(formData.basePrice).replace('.', ',')} onChange={handleNumericInputChange} onBlur={handleNumericInputBlur} className={cn("text-right", inputHoverClass)} disabled={isSaving} />
                                </div>
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label>Tipo de IVA <span className={cn(typeof formData.basePrice === 'number' && formData.basePrice > 0 ? "text-red-500" : "text-gray-500")}>*</span></Label>
                                    <Popover open={ivaPopoverOpen} onOpenChange={setIvaPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={ivaPopoverOpen} className={cn("w-full justify-between", inputHoverClass, !formData.defaultVatId && "text-muted-foreground")} disabled={isSaving}>
                                                {formData.defaultVatId ? vatTypes.find((vat) => vat.id === formData.defaultVatId)?.name : "Seleccionar tipo IVA..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar tipo IVA..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontró ningún tipo de IVA.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem key="no-vat" value="Sin IVA" onSelect={() => { handleSelectChange("defaultVatId", null); setIvaPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", formData.defaultVatId === null ? "opacity-100" : "opacity-0")} /> Sin IVA
                                                        </CommandItem>
                                                        {vatTypes.map((vat) => (
                                                            <CommandItem 
                                                                key={vat.id} 
                                                                value={vat.name} 
                                                                onSelect={() => { 
                                                                    handleSelectChange("defaultVatId", vat.id); 
                                                                    setIvaPopoverOpen(false); 
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", formData.defaultVatId === vat.id ? "opacity-100" : "opacity-0")} />
                                                                {vat.name} ({vat.rate.toFixed(2)}%)
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <Label htmlFor="duration">Duración (minutos) <span className="text-red-500">*</span></Label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDurationChange(-5)} disabled={isSaving || (formData.duration ?? 0) <= 1} aria-label="Disminuir duración">
                                            <Minus className="h-4 w-4" />
                                        </Button>
                                        <Input id="duration" name="duration" type="text" inputMode="numeric" value={formData.duration ?? ''} onChange={handleNumericInputChange} onBlur={handleNumericInputBlur} className={cn("text-center w-16", inputHoverClass)} disabled={isSaving} min={1} step={1} />
                                        <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDurationChange(5)} disabled={isSaving} aria-label="Aumentar duración">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <ColorPicker
                                        label="Color Agenda"
                                        color={formData.color || "#7c3aed"}
                                        onChange={(color) => handleSelectChange("color", color)}
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <Label>Equipo Requerido</Label>
                                    <Popover open={equipoPopoverOpen} onOpenChange={setEquipoPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={equipoPopoverOpen} className={cn("w-full justify-between", inputHoverClass, !formData.equipmentId && "text-muted-foreground", isEquipmentInherited && "border-blue-300 bg-blue-50")} disabled={isSaving || equipments.length === 0}>
                                                {formData.equipmentId ? (
                                                    <div className="flex items-center gap-2">
                                                        {equipments.find((eq) => eq.id === formData.equipmentId)?.name}
                                                        {isEquipmentInherited && <span className="text-xs text-blue-600">📋</span>}
                                                    </div>
                                                ) : equipments.length === 0 ? "No hay equipos disponibles" : "Seleccionar equipo..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar equipo..." />
                                                <CommandList>
                                                    <CommandEmpty>No se encontró ningún equipo.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem key="no-equipment" value="Ninguno" onSelect={() => { handleSelectChange("equipmentId", null); setEquipoPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", formData.equipmentId === null ? "opacity-100" : "opacity-0")} />Ninguno</CommandItem>
                                                        {equipments.map((eq) => (
                                                            <CommandItem 
                                                                key={eq.id} 
                                                                value={eq.name} 
                                                                onSelect={() => { 
                                                                    handleSelectChange("equipmentId", eq.id); 
                                                                    setEquipoPopoverOpen(false); 
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", formData.equipmentId === eq.id ? "opacity-100" : "opacity-0")} />
                                                                {eq.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    
                                    {/* ✅ NUEVO: Mostrar información de herencia */}
                                    {isEquipmentInherited && inheritedEquipmentId && (
                                        <div className="text-sm text-blue-600 flex items-center gap-1">
                                            <span className="text-xs">📋</span>
                                            <span>Heredado de familia</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Comisión Base</Label>
                                    <div className="flex gap-2">
                                        <Popover open={comisionPopoverOpen} onOpenChange={setComisionPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" aria-expanded={comisionPopoverOpen} className={cn("flex-1 justify-between", inputHoverClass, !formData.commissionType && "text-muted-foreground")} disabled={isSaving}>{formData.commissionType ? tiposComision.find((tc) => tc.id === formData.commissionType)?.nombre : "Tipo..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Command>
                                                    <CommandList>
                                                        <CommandEmpty>No se encontró.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem key="no-commission" value="Sin Comisión" onSelect={() => { handleSelectChange("commissionType", null); handleSelectChange("commissionValue", null); setComisionPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", formData.commissionType === null ? "opacity-100" : "opacity-0")} />Sin Comisión</CommandItem>
                                                            {tiposComision.map((tc) => (<CommandItem key={tc.id} value={tc.nombre} onSelect={() => { handleSelectChange("commissionType", tc.id); setComisionPopoverOpen(false); }}><Check className={cn("mr-2 h-4 w-4", formData.commissionType === tc.id ? "opacity-100" : "opacity-0")} />{tc.nombre}</CommandItem>))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Input type="text" inputMode="decimal" name="commissionValue" placeholder="Valor" value={formData.commissionValue === null ? '' : String(formData.commissionValue).replace('.', ',')} onChange={handleNumericInputChange} onBlur={handleNumericInputBlur} className={cn("w-24 text-right", inputHoverClass)} disabled={isSaving || !formData.commissionType} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Derecha (lg:col-span-1) */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Card: Opciones */}
                    <Card className="shadow-sm transition-all duration-300 overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Opciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             {/* Ya no usamos grid aquí, los checkboxes se apilan */}
                             {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3"> */}
                            {renderCheckboxField("showInApp", "Mostrar en App de Reservas")}
                            {renderCheckboxField("isActive", "Servicio Activo")}
                            {renderCheckboxField("requiresParams", "Requiere Parámetros")}
                            {renderCheckboxField("isValuationVisit", "Visita de Valoración")}
                            {renderCheckboxField("allowAutomaticDiscounts", "Permitir Desc. Automáticos")}
                            {renderCheckboxField("allowManualDiscounts", "Permitir Desc. Manuales")}
                            {renderCheckboxField("acceptsPromotions", "Acepta Promociones")}
                            {renderCheckboxField("allowPvpEditing", "Permitir editar PVP en Venta")}
                            {renderCheckboxField("affectsStatistics", "Afecta a Estadísticas")}
                            {/* </div> */}
                        </CardContent>
                    </Card>

                    {/* Card: Imágenes (Placeholder) */}
                    <Card className="shadow-sm transition-all duration-300 overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <ImageIcon className="w-5 h-5 mr-2 text-blue-600" /> Imágenes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm italic text-gray-500">Gestión de imágenes pendiente.</p>
                            {/* <Button variant="outline" disabled className="mt-2">Añadir Imágenes</Button> */}
                        </CardContent>
                    </Card>

                    {/* Card: Documentos (Placeholder) */}
                    <Card className="shadow-sm transition-all duration-300 overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" /> Documentos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm italic text-gray-500">Gestión de documentos pendiente.</p>
                            {/* <Button variant="outline" disabled className="mt-2">Añadir Documentos</Button> */}
                        </CardContent>
                    </Card>
                </div>
                {/* --- FIN MODIFICACIÓN --- */}
            </div>

            {/* --- Modales --- */}
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

            <Dialog open={showMandatoryFieldsModal} onOpenChange={setShowMandatoryFieldsModal}>
                <DialogContent className="sm:max-w-md border">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="flex items-center">
                            <AlertCircle className="text-red-500 mr-2" />
                            Campos Obligatorios Faltantes
                        </DialogTitle>
                    </DialogHeader>
                     <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-2">
                            Por favor, completa los siguientes campos antes de guardar:
                        </p>
                        <ul className="list-disc list-inside mt-2 text-red-600">
                            {missingFields.map((field, index) => (
                                <li key={index}>{field}</li>
                            ))}
                        </ul>
                    </div>
                    <DialogFooter className="pt-4">
                         <Button variant="outline" onClick={() => setShowMandatoryFieldsModal(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             {/* Botón de guardado interno oculto */}
            <button type="submit" style={{ display: 'none' }} aria-hidden="true"></button>
        </form>
    );
}; 