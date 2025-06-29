"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Power, Package, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Module {
    id: string;
    name: string;
    description: string;
    logoUrl: string | null;
    category: string;
    isPaid: boolean;
    isActive: boolean;
}

export default function IntegrationsMarketplacePage() {
    const { t } = useTranslation();
    const [integrations, setIntegrations] = useState<Record<string, Module[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activatingModules, setActivatingModules] = useState<Set<string>>(new Set());
    const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchIntegrations = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/internal/integrations');
                if (response.ok) {
                    const data = await response.json();
                    setIntegrations(data);
                }
            } catch (error) {
                console.error("Error fetching integrations:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchIntegrations();
    }, []);

    const filteredIntegrations = useMemo(() => {
        if (selectedCategory === 'ACTIVE') {
            // Filtro especial para módulos activos
            const activeModules: Record<string, Module[]> = {};
            Object.entries(integrations).forEach(([category, modules]) => {
                const activeInCategory = modules.filter(module => module.isActive);
                if (activeInCategory.length > 0) {
                    activeModules[category] = activeInCategory;
                }
            });
            return activeModules;
        } else if (!selectedCategory) {
            return integrations;
        }
        return {
            [selectedCategory]: integrations[selectedCategory] || []
        };
    }, [integrations, selectedCategory]);

    // Determinar si mostrar navegación por páginas (solo en vista "Todos")
    const showPagination = !selectedCategory;
    const itemsPerPage = 1; // Una tarjeta por página en vista "Todos"

    // Función para obtener la página actual de una categoría
    const getCurrentPage = (category: string) => categoryPages[category] || 0;

    // Función para cambiar página de una categoría
    const changePage = (category: string, direction: 'prev' | 'next') => {
        const modules = filteredIntegrations[category] || [];
        const currentPage = getCurrentPage(category);
        const maxPage = Math.max(0, modules.length - 1);
        
        let newPage = currentPage;
        if (direction === 'prev' && currentPage > 0) {
            newPage = currentPage - 1;
        } else if (direction === 'next' && currentPage < maxPage) {
            newPage = currentPage + 1;
        }
        
        setCategoryPages(prev => ({
            ...prev,
            [category]: newPage
        }));
    };

    const handleToggleActivation = async (moduleId: string, currentStatus: boolean) => {
        setActivatingModules(prev => new Set(prev).add(moduleId));
        
        try {
            if (currentStatus) {
                // Desactivar módulo
                const response = await fetch(`/api/internal/integrations/${moduleId}/deactivate`, {
                    method: 'POST',
                });

                if (response.ok) {
                    toast.success('Módulo desactivado exitosamente');
                    updateModuleStatus(moduleId, false);
                } else {
                    const error = await response.json();
                    toast.error(error.error || 'Error al desactivar el módulo');
                }
            } else {
                // Activar módulo
                const response = await fetch(`/api/internal/integrations/${moduleId}/activate`, {
                    method: 'POST',
                });

                if (response.ok) {
                    toast.success('Módulo activado exitosamente');
                    updateModuleStatus(moduleId, true);
                } else {
                    const error = await response.json();
                    toast.error(error.error || 'Error al activar el módulo');
                }
            }
        } catch (error) {
            console.error('Error toggling module:', error);
            toast.error('Error de conexión');
        } finally {
            setActivatingModules(prev => {
                const updated = new Set(prev);
                updated.delete(moduleId);
                return updated;
            });
        }
    };

    const updateModuleStatus = (moduleId: string, isActive: boolean) => {
        setIntegrations(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(category => {
                updated[category] = updated[category].map(module => 
                    module.id === moduleId 
                        ? { ...module, isActive }
                        : module
                );
            });
            return updated;
        });
    };

    const CATEGORY_NAMES: Record<string, string> = {
        IOT_DEVICES: t('integrations.categories.IOT_DEVICES'),
        AUTOMATION: t('integrations.categories.AUTOMATION'),
        MARKETING: t('integrations.categories.MARKETING'),
        PAYMENTS: t('integrations.categories.PAYMENTS'),
        COMMUNICATION: t('integrations.categories.COMMUNICATION'),
        ACCOUNTING: t('integrations.categories.ACCOUNTING'),
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">Cargando integraciones...</span>
                </div>
            </div>
        );
    }

    const ModuleCard = ({ module }: { module: Module }) => (
        <Card className={cn(
            "flex flex-col transition-all duration-200 hover:shadow-md",
            module.isActive && "ring-2 ring-green-200 bg-green-50/30"
        )}>
            <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        module.isActive ? "bg-green-100" : "bg-muted"
                    )}>
                        {module.isActive ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <Package className="w-5 h-5" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight mb-1">{module.name}</CardTitle>
                        <div className="flex items-center gap-2">
                            {module.isActive && (
                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 text-xs">
                                    Activo
                                </Badge>
                            )}
                            {module.isPaid && <Badge variant="secondary" className="text-xs">PRO</Badge>}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0 pb-4">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{module.description}</p>
                <Button 
                    size="sm"
                    className={cn(
                        "w-full text-sm",
                        module.isActive 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "bg-primary hover:bg-primary/90"
                    )}
                    onClick={() => handleToggleActivation(module.id, module.isActive)}
                    disabled={activatingModules.has(module.id)}
                >
                    {activatingModules.has(module.id) ? (
                        <>
                            <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            {module.isActive ? 'Desactivando...' : 'Activando...'}
                        </>
                    ) : (
                        <>
                            <Power className="w-4 h-4 mr-2" />
                            {module.isActive ? 'Desactivar' : 'Activar'}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{t('integrations.marketplace.title')}</h1>
                <p className="text-lg text-muted-foreground">{t('integrations.marketplace.subtitle')}</p>
            </header>

            {/* Filtros de categorías - SIEMPRE VISIBLES */}
            <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant={selectedCategory === 'ACTIVE' ? 'default' : 'outline'} 
                        onClick={() => setSelectedCategory('ACTIVE')}
                        className="text-sm"
                    >
                        Activos
                    </Button>
                    <Button 
                        variant={!selectedCategory ? 'default' : 'outline'} 
                        onClick={() => setSelectedCategory(null)}
                        className="text-sm"
                    >
                        {t('integrations.marketplace.all_button')}
                    </Button>
                    {Object.keys(integrations).map(category => (
                        <Button 
                            key={category} 
                            variant={selectedCategory === category ? 'default' : 'outline'} 
                            onClick={() => setSelectedCategory(category)}
                            className="text-sm"
                        >
                            {CATEGORY_NAMES[category] || category}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Contenido principal */}
            <div>
                {Object.keys(filteredIntegrations).length > 0 ? (
                    /* Layout en columnas para todas las vistas */
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {Object.entries(filteredIntegrations).map(([category, modules]) => {
                            const currentPage = getCurrentPage(category);
                            const hasMultipleItems = modules.length > 1;
                            const displayModules = showPagination && hasMultipleItems 
                                ? [modules[currentPage]] 
                                : modules;

                            return (
                                <section key={category} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-semibold">{CATEGORY_NAMES[category] || category}</h2>
                                            <Badge variant="outline" className="text-xs">
                                                {showPagination && hasMultipleItems 
                                                    ? `${currentPage + 1}/${modules.length}` 
                                                    : modules.length
                                                }
                                            </Badge>
                                        </div>
                                        
                                        {/* Navegación por páginas - solo en vista "Todos" y si hay múltiples items */}
                                        {showPagination && hasMultipleItems && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => changePage(category, 'prev')}
                                                    disabled={currentPage === 0}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => changePage(category, 'next')}
                                                    disabled={currentPage >= modules.length - 1}
                                                    className="h-8 w-8 p-0"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {displayModules.map(module => (
                                            <ModuleCard key={module.id} module={module} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            {selectedCategory === 'ACTIVE' ? 'No hay módulos activos' : 'No hay módulos disponibles'}
                        </h3>
                        <p className="text-muted-foreground">
                            {selectedCategory === 'ACTIVE' 
                                ? 'Activa algunos módulos para verlos aquí.'
                                : 'No se encontraron módulos en esta categoría.'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
} 