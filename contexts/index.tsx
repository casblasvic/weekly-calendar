import React from 'react';
import { FileProvider } from './file-context';
import { ImageProvider } from './image-context';
import { DocumentProvider } from './document-context';
import { StorageProvider } from './storage-context';
import { InterfazProvider } from './interfaz-Context';
import { ClientProvider } from './client-context';
import { ScheduleTemplatesProvider } from './schedule-templates-context';
import { ScheduleBlocksProvider } from './schedule-blocks-context';
import { AppointmentTagsProvider } from './appointment-tags-context';
import { DataServiceProvider } from './data-context';
import { UserProvider } from './user-context';
import { ClinicScheduleProvider } from './clinic-schedule-context';
import { RoleProvider } from './role-context';
import { ServiceProvider } from './service-context';
import { ClinicProvider } from './clinic-context';

// Combine all providers
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DataServiceProvider>
      <InterfazProvider>
        <FileProvider>
          <StorageProvider>
            <ImageProvider>
              <DocumentProvider>
                <ClientProvider>
                  <UserProvider>
                    <ScheduleTemplatesProvider>
                      <ScheduleBlocksProvider>
                        <AppointmentTagsProvider>
                          <ClinicProvider>
                            <ClinicScheduleProvider>
                              <RoleProvider>
                                <ServiceProvider>
                                  {children}
                                </ServiceProvider>
                              </RoleProvider>
                            </ClinicScheduleProvider>
                          </ClinicProvider>
                        </AppointmentTagsProvider>
                      </ScheduleBlocksProvider>
                    </ScheduleTemplatesProvider>
                  </UserProvider>
                </ClientProvider>
              </DocumentProvider>
            </ImageProvider>
          </StorageProvider>
        </FileProvider>
      </InterfazProvider>
    </DataServiceProvider>
  );
}; 