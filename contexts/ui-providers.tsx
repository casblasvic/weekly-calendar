import React from 'react';
import { ClinicProvider } from './clinic-context';
import { LastClientProvider } from './last-client-context';
import { ClientCardProvider } from './client-card-context';
import { CabinProvider } from './CabinContext';
import { FamilyProvider } from './family-context';
import { ServicioProvider } from './servicios-context';
import { ConsumoServicioProvider } from './consumo-servicio-context';
import { EquipmentProvider } from './equipment-context';
import { InterfazProvider } from './interfaz-Context';
import { ImageProvider } from './image-context';
import { DocumentProvider } from './document-context';

// ✅ PROVIDERS DE UI - Consolidados para carga eficiente
export const UIProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ImageProvider>
      <DocumentProvider>
        <EquipmentProvider>
          <ClinicProvider>
            <FamilyProvider>
              <CabinProvider>
                <LastClientProvider>
                  <ClientCardProvider>
                    <ServicioProvider>
                      <ConsumoServicioProvider>
                        {children}
                      </ConsumoServicioProvider>
                    </ServicioProvider>
                  </ClientCardProvider>
                </LastClientProvider>
              </CabinProvider>
            </FamilyProvider>
          </ClinicProvider>
        </EquipmentProvider>
      </DocumentProvider>
    </ImageProvider>
  );
};