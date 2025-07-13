import React from 'react';
import { FileProvider } from './file-context';
import { StorageProvider } from './storage-context';
import { ClientProvider } from './client-context';
import { ScheduleTemplatesProvider } from './schedule-templates-context';
import { ScheduleBlocksProvider } from './schedule-blocks-context';
import { InterfazProvider } from './interfaz-Context';

// ✅ PROVIDERS DE DATOS - Consolidados para carga eficiente
export const DataProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <InterfazProvider>
      <FileProvider>
        <StorageProvider>
          <ClientProvider>
            <ScheduleTemplatesProvider>
              <ScheduleBlocksProvider>
                {children}
              </ScheduleBlocksProvider>
            </ScheduleTemplatesProvider>
          </ClientProvider>
        </StorageProvider>
      </FileProvider>
    </InterfazProvider>
  );
};