"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductForm } from '@/components/product/product-form'; // Importar el formulario reutilizable
import { Button } from "@/components/ui/button";
import { toast as sonnerToast } from "sonner";

export default function NuevoProductoPage() {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (formData: any) => { // Usar tipo más específico si es posible
        setIsSaving(true);
        try {
            // La lógica de transformación (precios, etc.) debe estar en ProductForm
            // o aquí antes de enviar.
            // Asegurémonos que `formData` viene ya procesado de `ProductForm`
            
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            sonnerToast.success("Producto creado correctamente.");
            // Redirigir a la lista de productos o a la página de edición del nuevo producto?
            // Por ahora, volvemos a la lista.
            router.push('/configuracion/productos'); 
            // Opcional: refrescar la ruta si volvemos a la misma página
            // router.refresh(); 

        } catch (error) {
            console.error("Error creando producto:", error);
            sonnerToast.error(`Error al crear el producto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            setIsSaving(false); // Permitir reintentar
        } 
        // No poner finally setIsSaving(false) aquí si redirigimos
    };

    // --- Placeholders para funcionalidad futura --- 
    const handleOpenPuntosModal = () => sonnerToast.info("Funcionalidad de Puntos pendiente.");
    const handleNavigateBonos = () => sonnerToast.info("Funcionalidad de Bonos pendiente.");
    const handleNavigateSuscripciones = () => sonnerToast.info("Funcionalidad de Suscripciones pendiente.");
    const handleAyuda = () => sonnerToast.info("Funcionalidad de Ayuda pendiente.");

    return (
        // Volver a usar Fragment <> y pb-24 en el div de contenido
        <>
            {/* Contenido principal con padding, max-w y pb-24 */}
            <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pb-24"> 
                <h1 className="text-2xl font-semibold mb-6">Nuevo Producto</h1>
                
                 {/* Contenedor del formulario */}
                 <div>
                    <ProductForm 
                        initialData={null} 
                        isSaving={isSaving} 
                        onSubmit={handleSubmit} 
                    />
                </div>
            </div> 
            
            {/* Footer fixed usando CSS Variables para left/width */}
            <footer 
                className="fixed bottom-0 z-10 border-t bg-background py-3 px-4 md:px-6 lg:px-8"
                style={{
                    left: 'var(--main-margin-left)', 
                    width: 'var(--main-width)',
                    transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out'
                } as React.CSSProperties}
            >
                <div className="max-w-4xl mx-auto flex items-center justify-start space-x-2">
                    {/* Botones Izquierda y Derecha mezclados */}
                    <Button variant="outline" onClick={handleOpenPuntosModal} disabled={isSaving}>Puntos</Button>
                    <Button variant="outline" onClick={handleNavigateBonos} disabled={isSaving}>Bonos</Button>
                    <Button variant="outline" onClick={handleNavigateSuscripciones} disabled={isSaving}>Suscripciones</Button>
                    
                    <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSaving}>Volver</Button>
                    <Button 
                        type="submit" 
                        form="product-form" // Asegúrate que el ID en ProductForm coincide
                        disabled={isSaving}
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button variant="secondary" type="button" onClick={handleAyuda} disabled={isSaving}>Ayuda</Button>
                </div>
            </footer>
        </>
    );
}

// Nota: Para que el botón Guardar externo funcione, el <form> dentro de 
// ProductForm necesita tener el id="product-form". (Verificación: Ya lo hicimos) 