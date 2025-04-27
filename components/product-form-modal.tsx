"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast as sonnerToast } from "sonner";
import { Product, Category, VATType } from '@prisma/client';

interface ProductFormModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    productToEdit?: Product | null;
    onSuccess: () => void; // Callback para refrescar la lista después de guardar/crear
}

// Interfaz para los datos del formulario
interface ProductFormData {
    name: string;
    description: string | null;
    sku: string | null;
    price: number | string; // Usar string para manejar input vacío
    costPrice: number | string | null; // Usar string para manejar input vacío y nombre correcto (costPrice)
    isActive: boolean;
    categoryId: string | null;
    vatTypeId: string | null; // Usar vatTypeId
}

export function ProductFormModal({ isOpen, onOpenChange, productToEdit, onSuccess }: ProductFormModalProps) {
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: null,
        sku: null,
        price: '',
        costPrice: null,
        isActive: true,
        categoryId: null,
        vatTypeId: null,
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [vatTypes, setVatTypes] = useState<VATType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Cargar categorías y tipos de IVA al montar el modal si está abierto
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [catResponse, vatResponse] = await Promise.all([
                    fetch('/api/categories'), // Asumiendo API existente
                    fetch('/api/vat-types')   // API existente
                ]);
                if (!catResponse.ok || !vatResponse.ok) {
                    throw new Error('Error al cargar datos necesarios');
                }
                const cats = await catResponse.json();
                const vats = await vatResponse.json();
                setCategories(cats);
                setVatTypes(vats);
            } catch (error) {
                console.error("Error fetching data for modal:", error);
                sonnerToast.error("No se pudieron cargar las categorías o tipos de IVA.");
            } finally {
                setIsLoading(false);
            }
        }
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    // Rellenar formulario si estamos editando
    useEffect(() => {
        if (productToEdit) {
            setFormData({
                name: productToEdit.name,
                description: productToEdit.description || null,
                sku: productToEdit.sku || null,
                price: productToEdit.price?.toString() ?? '', // Convertir a string, manejar null/undefined
                costPrice: productToEdit.costPrice?.toString() ?? null, // Convertir a string, usar costPrice
                isActive: productToEdit.isActive,
                categoryId: productToEdit.categoryId || null,
                vatTypeId: productToEdit.vatTypeId || null, // Usar vatTypeId
            });
        } else {
            // Resetear formulario si abrimos para crear
            setFormData({
                name: '', description: null, sku: null, price: '', costPrice: null,
                isActive: true, categoryId: null, vatTypeId: null,
            });
        }
        setErrors({}); // Limpiar errores al abrir/cambiar modo
    }, [productToEdit, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' })); // Limpiar error al escribir
    };

     const handleSelectChange = (value: string, name: keyof ProductFormData) => {
        setFormData(prev => ({ ...prev, [name]: value || null })); // Guardar null si value es vacío
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleSwitchChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, isActive: checked }));
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es obligatorio.';
        }
        const priceNum = parseFloat(formData.price as string);
        if (isNaN(priceNum) || priceNum < 0) {
            newErrors.price = 'El precio base debe ser un número mayor o igual a 0.';
        }
         if (formData.costPrice !== null && formData.costPrice !== '') {
            const costNum = parseFloat(formData.costPrice as string);
            if (isNaN(costNum) || costNum < 0) {
                 newErrors.costPrice = 'El coste debe ser un número mayor o igual a 0 (o dejar vacío).';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        const url = productToEdit ? `/api/products/${productToEdit.id}` : '/api/products';
        const method = productToEdit ? 'PUT' : 'POST';

        // Preparar datos, convirtiendo precio/coste a número y usando nombres correctos
        const dataToSend = {
            ...formData,
            price: parseFloat(formData.price as string),
            costPrice: formData.costPrice !== null && formData.costPrice !== '' ? parseFloat(formData.costPrice as string) : null,
            // vatTypeId y categoryId ya están como string | null
        };

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            sonnerToast.success(`Producto ${productToEdit ? 'actualizado' : 'creado'} correctamente.`);
            onSuccess(); // Llama al callback para refrescar
            onOpenChange(false); // Cierra el modal

        } catch (error) {
            console.error("Error submitting product form:", error);
            sonnerToast.error(`Error al ${productToEdit ? 'actualizar' : 'crear'} el producto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
             if (error instanceof Error && (error.message.toLowerCase().includes('sku') || error.message.toLowerCase().includes('conflicto'))) {
                 setErrors(prev => ({ ...prev, sku: error.message }));
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>{productToEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                    <DialogDescription>
                        {productToEdit ? 'Modifica los detalles del producto.' : 'Introduce los detalles del nuevo producto.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Name */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre *</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                             {errors.name && <p className="col-span-4 text-red-500 text-sm text-right -mt-2">{errors.name}</p>}
                        </div>
                        {/* Description */}
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="description" className="text-right">Descripción</Label>
                            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} className="col-span-3" rows={2}/>
                        </div>
                        {/* SKU */}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sku" className="text-right">SKU</Label>
                            <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleInputChange} className="col-span-3" />
                            {errors.sku && <p className="col-span-4 text-red-500 text-sm text-right -mt-2">{errors.sku}</p>}
                        </div>
                         {/* Price */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Precio Base *</Label>
                            <Input id="price" name="price" type="number" step="0.01" min="0" value={formData.price} onChange={handleInputChange} className="col-span-3" />
                            {errors.price && <p className="col-span-4 text-red-500 text-sm text-right -mt-2">{errors.price}</p>}
                        </div>
                        {/* Cost Price */}
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="costPrice" className="text-right">Coste</Label>
                            <Input id="costPrice" name="costPrice" type="number" step="0.01" min="0" value={formData.costPrice ?? ''} onChange={handleInputChange} className="col-span-3" placeholder="Opcional" />
                             {errors.costPrice && <p className="col-span-4 text-red-500 text-sm text-right -mt-2">{errors.costPrice}</p>}
                        </div>
                         {/* Category */}
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="categoryId" className="text-right">Categoría</Label>
                            <Select name="categoryId" value={formData.categoryId || ''} onValueChange={(value) => handleSelectChange(value, 'categoryId')}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar categoría..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Sin categoría</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* VAT Type */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="vatTypeId" className="text-right">IVA Base</Label>
                            <Select name="vatTypeId" value={formData.vatTypeId || ''} onValueChange={(value) => handleSelectChange(value, 'vatTypeId')}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Seleccionar IVA..." />
                                </SelectTrigger>
                                <SelectContent>
                                     <SelectItem value="">Sin IVA específico</SelectItem>
                                     {vatTypes.map((vat) => (
                                         <SelectItem key={vat.id} value={vat.id}>{vat.name} ({vat.rate}%)</SelectItem>
                                     ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Is Active */}
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="isActive" className="text-right">Activo</Label>
                            <Switch id="isActive" checked={formData.isActive} onCheckedChange={handleSwitchChange} className="col-span-3 justify-self-start"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : (productToEdit ? 'Guardar Cambios' : 'Crear Producto')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 