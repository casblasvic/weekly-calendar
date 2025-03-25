"use client"

import React, { createContext, useContext, useState } from 'react';
import { useInterfaz } from './interfaz-Context';
import { EntityDocument } from '@/services/data/models/interfaces';
import { v4 as uuidv4 } from 'uuid';

// Alias para tipos específicos usando tipos del modelo central
export type DocumentFile = EntityDocument;

interface DocumentContextType {
  uploadDocument: (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string, 
    category?: string,
    onProgress?: (progress: number) => void
  ) => Promise<DocumentFile>;
  getDocumentsByEntity: (entityType: string, entityId: string, category?: string) => Promise<DocumentFile[]>;
  categorizeDocument: (documentId: string, category: string) => Promise<boolean>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();
  
  // Función para subir un documento
  const uploadDocument = async (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string,
    category?: string,
    onProgress?: (progress: number) => void
  ): Promise<DocumentFile> => {
    // Lista de tipos MIME aceptados como documentos
    const docTypes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    // Verificar que el archivo sea un documento
    if (!docTypes.includes(file.type)) {
      throw new Error('El archivo no es un documento válido');
    }
    
    // Generar ID único para el documento
    const documentId = uuidv4();
    
    try {
      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('clinicId', clinicId);
      formData.append('fileId', documentId);
      if (category) {
        formData.append('category', category);
      }
      
      // Enviar al endpoint de carga
      const response = await fetch('/api/storage/upload-document', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al subir documento: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Error desconocido al subir documento");
      }
      
      // Crear objeto de documento con los metadatos devueltos
      const newDocument: DocumentFile = {
        id: documentId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        url: result.publicUrl,
        path: result.path,
        entityType,
        entityId,
        category: category || 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Guardar el documento a través de la interfaz
      await interfaz.saveEntityDocuments(entityType, entityId, [newDocument], category);
      
      return newDocument;
    } catch (error) {
      console.error('Error al guardar documento:', error);
      throw new Error('No se pudo guardar el documento');
    }
  };
  
  // Obtener documentos por entidad
  const getDocumentsByEntity = async (entityType: string, entityId: string, category?: string): Promise<DocumentFile[]> => {
    try {
      const documents = await interfaz.getEntityDocuments(entityType, entityId, category);
      return documents || [];
    } catch (error) {
      console.error('Error al obtener documentos:', error);
      return [];
    }
  };
  
  // Categorizar un documento
  const categorizeDocument = async (documentId: string, category: string): Promise<boolean> => {
    try {
      // Primero necesitamos encontrar el documento para saber a qué entidad pertenece
      // Esto es un enfoque simplificado que depende de cómo se implemente en la interfaz
      const allDocs = await interfaz.getEntityDocuments('*', '*');
      const doc = allDocs.find(d => d.id === documentId);
      
      if (!doc) {
        throw new Error(`Documento con id ${documentId} no encontrado`);
      }
      
      // Recuperar todos los documentos de esta entidad/categoría
      const docs = await interfaz.getEntityDocuments(doc.entityType, doc.entityId, doc.category);
      
      // Encontrar y actualizar el documento específico
      const updatedDocs = docs.map(d => {
        if (d.id === documentId) {
          return {
            ...d,
            category
          };
        }
        return d;
      });
      
      // Guardar los cambios
      return await interfaz.saveEntityDocuments(doc.entityType, doc.entityId, updatedDocs, doc.category);
    } catch (error) {
      console.error('Error al categorizar documento:', error);
      return false;
    }
  };
  
  return (
    <DocumentContext.Provider value={{
      uploadDocument,
      getDocumentsByEntity,
      categorizeDocument
    }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments debe ser usado dentro de un DocumentProvider');
  }
  return context;
}; 