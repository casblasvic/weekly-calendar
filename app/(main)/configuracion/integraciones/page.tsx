"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Link2, Webhook, Cpu, Network, Zap, Power, Settings, CheckCircle, Package } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next';

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
        if (!selectedCategory) {
            return integrations;
        }
        return {
            [selectedCategory]: integrations[selectedCategory] || []
        };
    }, [integrations, selectedCategory]);
    
    const handleActivation = (moduleId: string, currentStatus: boolean) => {
        // Lógica de activación/desactivación que se implementará en la siguiente fase
        console.log(`Toggling module ${moduleId}, current status: ${currentStatus}`);
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
        return <div>Cargando integraciones...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">{t('integrations.marketplace.title')}</h1>
                <p className="text-lg text-muted-foreground">{t('integrations.marketplace.subtitle')}</p>
            </header>
            
            <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                    <Button variant={!selectedCategory ? 'default' : 'outline'} onClick={() => setSelectedCategory(null)}>{t('integrations.marketplace.all_button')}</Button>
                    {Object.keys(integrations).map(category => (
                        <Button key={category} variant={selectedCategory === category ? 'default' : 'outline'} onClick={() => setSelectedCategory(category)}>
                            {CATEGORY_NAMES[category] || category}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(filteredIntegrations).map(([category, modules]) => (
                    <section key={category}>
                        <h2 className="text-2xl font-semibold mb-4">{CATEGORY_NAMES[category] || category}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {modules.map(module => (
                                <Card key={module.id} className="flex flex-col">
                                    <CardHeader className="flex flex-row items-start gap-4">
                                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                                            {/* Aquí iría el logo */}
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{module.name}</CardTitle>
                                            {module.isPaid && <Badge variant="secondary">PRO</Badge>}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground">{module.description}</p>
                                    </CardContent>
                                    <div className="p-6 pt-0">
                                        <Button 
                                            className="w-full" 
                                            variant={module.isActive ? "secondary" : "default"}
                                            onClick={() => handleActivation(module.id, module.isActive)}
                                        >
                                            {module.isActive ? <><Settings className="w-4 h-4 mr-2" />Gestionar</> : <><Power className="w-4 h-4 mr-2" />Activar</>}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
} 