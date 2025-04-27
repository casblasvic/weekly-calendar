"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/format-utils';
import { useTranslation } from 'react-i18next';

// Interfaz simplificada para los paquetes en esta tabla
interface SimplePackageDefinition {
    id: string;
    name: string;
    price: number;
}

interface PackagesUsingItemTableProps {
    packages: SimplePackageDefinition[];
    isLoading: boolean;
    itemType: 'service' | 'product'; // Para personalizar mensajes
}

export function PackagesUsingItemTable({ packages, isLoading, itemType }: PackagesUsingItemTableProps) {
    const router = useRouter();
    const { t } = useTranslation();

    const handleViewPackage = (packageId: string) => {
        router.push(`/configuracion/paquetes/${packageId}`);
    };

    if (isLoading) {
        return <div className="text-center p-4">{t('common.loading')}</div>;
    }

    if (!packages || packages.length === 0) {
        const key = `packages.table.noPackagesForItem.${itemType}` as const;
        return (
            <div className="text-center p-4 text-muted-foreground">
                {t(key)
                 || `Este ${itemType === 'service' ? 'servicio' : 'producto'} no está incluido en ningún paquete actualmente.`}
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('packages.table.headers.name')}</TableHead> 
                        <TableHead className="text-right">{t('packages.table.headers.price')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                            <TableCell className="font-medium">{pkg.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pkg.price)}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewPackage(pkg.id)}
                                    title={t('packages.table.viewPackageTitle') || 'Ver paquete'}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
} 