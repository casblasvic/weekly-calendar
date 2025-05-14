"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
    Save, 
    HelpCircle, 
    ArrowLeft, 
    Briefcase, 
    Star, 
    Ticket, 
    Package as PackageIcon, 
    Cpu 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ServiceActionFooterProps {
    serviceId: string | null | undefined; // Null/undefined si es nuevo servicio
    isSaving: boolean;
    isLoading: boolean; // Para deshabilitar botones mientras carga datos iniciales
    formId: string;
    hasInitialData?: boolean; // Para asegurar que no se guarde antes de cargar en edición
    onBack: () => void;
    onHelp?: () => void; // Opcional
    onNavigate: (section: 'consumos' | 'puntos' | 'bonos' | 'paquetes' | 'recursos' | 'parametros' | 'avanzado') => void;
    onSubmitTrigger: () => void;
}

export const ServiceActionFooter: React.FC<ServiceActionFooterProps> = ({
    serviceId,
    isSaving,
    isLoading,
    formId,
    hasInitialData = true, // Por defecto true, poner a false si no aplica (como en 'nuevo')
    onBack,
    onHelp,
    onNavigate,
    onSubmitTrigger
}) => {
    const { t } = useTranslation();
    const disableActions = !serviceId || isLoading; // Deshabilitar acciones si no hay ID o está cargando

    // Define los botones de acción específicos del servicio
    const actionButtons = [
        { key: 'consumos', label: 'Consumos', icon: Briefcase, onClick: () => onNavigate('consumos') },
        { key: 'puntos', label: 'Puntos', icon: Star, onClick: () => onNavigate('puntos') },
        { key: 'bonos', label: 'Bonos', icon: Ticket, onClick: () => onNavigate('bonos') },
        { key: 'paquetes', label: t('sidebar.packages'), icon: PackageIcon, onClick: () => onNavigate('paquetes') },
        { key: 'recursos', label: 'Recursos', icon: Cpu, onClick: () => onNavigate('recursos') },
        // Añadir 'parametros' y 'avanzado' si son necesarios
    ];

    return (
        <footer 
            className="fixed bottom-0 z-10 px-4 py-3 border-t bg-background md:px-6 lg:px-8" 
            style={{
                left: 'var(--main-margin-left)', 
                width: 'var(--main-width)',
                transition: 'left 0.3s ease-in-out, width 0.3s ease-in-out' // Sincronizar transición
            } as React.CSSProperties}
        >
             {/* Usar flex-wrap para que los botones se muevan a la siguiente línea si no caben */}
             <div className="flex flex-nowrap items-center justify-start gap-2 max-w-4xl mx-auto">
                {/* Botones de Acción (Consumos, Puntos, etc.) */}
                {actionButtons.map(btn => (
                    <Button 
                        key={btn.key}
                        variant="outline" 
                        size="sm" 
                        onClick={btn.onClick} 
                        disabled={disableActions || isSaving}
                        className="whitespace-nowrap"
                    >
                         <btn.icon className="w-3.5 h-3.5 mr-1.5"/> {btn.label}
                    </Button>
                ))}

                {/* Separador o espacio flexible si se quiere alinear a la derecha los de Guardar/Volver */}
                 <div className="flex-grow"></div> 

                 {/* Botones Comunes (Volver, Guardar, Ayuda) */}
                 <Button variant="outline" onClick={onBack} disabled={isSaving}>
                     <ArrowLeft className="w-4 h-4 mr-2" />
                     {t('common.back')}
                 </Button>
                 <Button 
                     type="submit" 
                     form={formId} 
                    // Deshabilitar si está guardando, cargando, o si (en modo edición) no se han cargado los datos iniciales aún
                     disabled={isSaving || isLoading || (!serviceId && !hasInitialData && isLoading) || (!!serviceId && !hasInitialData) } 
                 >
                     <Save className="w-4 h-4 mr-2" />
                     {isSaving ? t('common.saving') : (serviceId ? t('common.saveChanges') : t('common.save'))}
                 </Button>
                 <Button variant="outline" size="icon" onClick={onHelp} disabled={isSaving || isLoading} title={t('common.help') || 'Ayuda'}>
                     <HelpCircle className="w-4 h-4" />
                     <span className="sr-only">{t('common.help') || 'Ayuda'}</span>
                 </Button>
            </div>
         </footer>
    );
}; 