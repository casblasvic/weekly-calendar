"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { Zap, Key, Activity, AlertTriangle } from "lucide-react";

export default function EnchufesInteligentesLayout({
    children,
}: {
    children: ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    
    // Determinar la pestaña activa basada en la ruta
    const getActiveTab = () => {
        if (pathname.includes('/credenciales')) return 'credenciales';
        if (pathname.includes('/dashboard')) return 'dashboard';
        if (pathname.includes('/anomalies')) return 'anomalies';
        return 'dispositivos'; // Por defecto
    };

    const activeTab = getActiveTab();

    const handleTabChange = (value: string) => {
        const basePath = '/configuracion/integraciones/EquiposIot/EnchufesInteligentes';
        
        switch (value) {
            case 'dispositivos':
                router.push(basePath);
                break;
            case 'credenciales':
                router.push(`${basePath}/credenciales`);
                break;
            case 'dashboard':
                router.push(`${basePath}/dashboard`);
                break;
            case 'anomalies':
                router.push(`${basePath}/anomalies`);
                break;
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6 max-w-7xl">
            <div>
                <h1 className="text-3xl font-bold">Enchufes Inteligentes</h1>
                <p className="text-muted-foreground">Gestiona los enchufes inteligentes y las credenciales de Shelly Cloud</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dispositivos">
                        <Zap className="w-4 h-4 mr-2" />
                        Dispositivos
                    </TabsTrigger>
                    <TabsTrigger value="credenciales">
                        <Key className="w-4 h-4 mr-2" />
                        Credenciales
                    </TabsTrigger>
                    <TabsTrigger value="dashboard">
                        <Activity className="w-4 h-4 mr-2" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="anomalies">
                        <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                        Control inteligente
                    </TabsTrigger>
                </TabsList>
                
                <div className="mt-6">
                    {children}
                </div>
            </Tabs>
        </div>
    );
} 