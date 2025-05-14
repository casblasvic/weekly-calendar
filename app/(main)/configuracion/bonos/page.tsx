"use client";

import React from 'react';
import { BonoDefinitionsClient } from './_components/client';
import { type Prisma } from '@prisma/client';

export type BonoDefinitionWithRelations = Prisma.BonoDefinitionGetPayload<{
    include: {
        service: { select: { id: true, name: true } };
        product: { select: { id: true, name: true } };
        settings: {
            select: {
                isActive: true;
                validityDays: true;
                pointsAwarded: true;
            }
        };
        tariffPrices: {
           select: {
                tariff: {
                    select: {
                        id: true;
                        name: true;
                    }
                }
            }
        };
    }
}>;

export default function BonoDefinitionsPage() {
  // Con nuestros hooks de API y React Query, ya no necesitamos cargar datos en el servidor
  // El componente cliente se encargará de cargar todos los datos utilizando los hooks que creamos
  return (
    <div className="container px-4 py-8 mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Definiciones de Bonos</h1>
      <BonoDefinitionsClient />
    </div>
  );
} 