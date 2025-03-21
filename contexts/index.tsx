import React from 'react';
import { FileProvider } from './file-context';
import { ImageProvider } from './image-context';
import { DocumentProvider } from './document-context';
import { StorageProvider } from './storage-context';

// Combine all providers
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <FileProvider>
      <StorageProvider>
        <ImageProvider>
          <DocumentProvider>
            {children}
          </DocumentProvider>
        </ImageProvider>
      </StorageProvider>
    </FileProvider>
  );
}; 