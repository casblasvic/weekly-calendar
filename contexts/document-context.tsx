"use client"

import React, { createContext, useContext, useState } from 'react';
import { useInterfaz } from './interfaz-Context';
// import { EntityDocument } from '@/services/data/models/interfaces'; // Eliminado
import { v4 as uuidv4 } from 'uuid';
import type { EntityDocument, EntityType } from '@prisma/client'; // Añadido EntityType
import { useSession } from 'next-auth/react'; // Añadido useSession

// Alias para tipos específicos usando tipos del modelo central
// export type DocumentFile = EntityDocument; // Eliminado

interface DocumentContextType {
  uploadDocument: (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string, 
    category?: string,
    onProgress?: (progress: number) => void
  ) => Promise<EntityDocument>; // Renombrado de DocumentFile
  getDocumentsByEntity: (entityType: string, entityId: string, category?: string) => Promise<EntityDocument[]>; // Renombrado de DocumentFile
  categorizeDocument: (documentId: string, category: string) => Promise<boolean>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataFetched, setDataFetched] = useState(false);
  const interfaz = useInterfaz();
  const { data: session } = useSession(); // Obtener sesión
  
  // Función para subir un documento
  const uploadDocument = async (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string, // Este clinicId puede usarse para obtener systemId si la sesión no lo tiene directamente
    category?: string,
    onProgress?: (progress: number) => void
  ): Promise<EntityDocument> => {
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
      // Asegurarse de tener la sesión y datos necesarios
      if (!session?.user?.id || !session?.user?.systemId) {
        throw new Error("Usuario no autenticado o falta información del sistema.");
      }
      const userId = session.user.id;
      const systemId = session.user.systemId;

      // Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('clinicId', clinicId); // Se sigue enviando por si el backend lo necesita
      formData.append('fileId', documentId);
      if (category) {
        formData.append('category', category); // Se sigue enviando por si el backend lo necesita
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
      
      // Crear objeto de documento con los metadatos devueltos y datos de sesión
      const newDocument: EntityDocument = {
        id: documentId,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.mimeType,
        documentUrl: result.publicUrl,
        // path: result.path, // Eliminado
        entityType: entityType as EntityType,
        entityId: entityId,
        // category: category || 'default', // Eliminado
        createdAt: new Date(),
        updatedAt: new Date(),
        systemId: systemId,
        uploadedByUserId: userId,
        description: null, // Asumiendo que es opcional o se puede dejar null
      };
      
      // Guardar el documento a través de la interfaz
      // NOTA: El parámetro 'category' se sigue pasando aquí, pero newDocument ya no lo contiene.
      // Esto puede requerir ajustes en 'interfaz.saveEntityDocuments' en el futuro.
      // Workaround: Usar 'as any' hasta refactorizar interfaz-Context
      await interfaz.saveEntityDocuments(entityType as EntityType, entityId, [newDocument] as any, category);
      
      return newDocument;
    } catch (error) {
      console.error('Error al guardar documento:', error);
      // Asegúrate de que el error que se lanza es útil
      if (error instanceof Error) {
          throw new Error(`No se pudo guardar el documento: ${error.message}`);
      } else {
          throw new Error('No se pudo guardar el documento por una causa desconocida');
      }
    }
  };
  
  // Obtener documentos por entidad
  const getDocumentsByEntity = async (entityType: string, entityId: string, category?: string): Promise<EntityDocument[]> => { // Renombrado de DocumentFile
    try {
      const documents = await interfaz.getEntityDocuments(entityType, entityId, category);
      // Workaround: Usar 'as any' hasta refactorizar interfaz-Context
      return (documents || []) as any;
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
      // Workaround: Usar 'as any' hasta refactorizar interfaz-Context
      return await interfaz.saveEntityDocuments(doc.entityType, doc.entityId, updatedDocs as any, doc.category);
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