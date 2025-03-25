import React from 'react';
import { FileProvider } from './file-context';
import { ImageProvider } from './image-context';
import { DocumentProvider } from './document-context';
import { StorageProvider } from './storage-context';
import { InterfazProvider } from './interfaz-Context';
import { ClientProvider } from './client-context';
import { ScheduleTemplatesProvider } from './schedule-templates-context';
import { ScheduleBlocksProvider } from './schedule-blocks-context';
import { LastClientProvider } from './last-client-context';

// Combine all providers
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <InterfazProvider>
      <FileProvider>
        <StorageProvider>
          <ImageProvider>
            <DocumentProvider>
              <ClientProvider>
                <LastClientProvider>
                  <ScheduleTemplatesProvider>
                    <ScheduleBlocksProvider>
                      {children}
                    </ScheduleBlocksProvider>
                  </ScheduleTemplatesProvider>
                </LastClientProvider>
              </ClientProvider>
            </DocumentProvider>
          </ImageProvider>
        </StorageProvider>
      </FileProvider>
    </InterfazProvider>
  );
}; 