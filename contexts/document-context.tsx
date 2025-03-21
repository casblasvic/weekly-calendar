import React, { createContext, useContext } from 'react';
import { useFiles, BaseFile, DocumentFile, FileFilter } from './file-context';

interface DocumentContextType {
  uploadDocument: (
    file: File, 
    entityType: string, 
    entityId: string, 
    clinicId: string, 
    category?: string,
    onProgress?: (progress: number) => void
  ) => Promise<DocumentFile>;
  getDocumentsByEntity: (entityType: string, entityId: string, category?: string) => DocumentFile[];
  categorizeDocument: (documentId: string, category: string) => Promise<boolean>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uploadFile, getFilesByFilter, updateFileMetadata } = useFiles();
  
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
    
    // Categorías para este documento
    const categories = ['documents'];
    if (category) {
      categories.push(category);
    }
    
    // Subir el archivo como documento
    const uploadedFile = await uploadFile(
      file, 
      {
        entityType,
        entityId,
        clinicId,
        categories,
        tags: [entityType, file.type.split('/')[1]]
      },
      onProgress
    ) as DocumentFile;
    
    return uploadedFile;
  };
  
  // Obtener documentos por entidad
  const getDocumentsByEntity = (entityType: string, entityId: string, category?: string): DocumentFile[] => {
    const filter: FileFilter = {
      entityType,
      entityId,
      isDeleted: false
    };
    
    let docs = getFilesByFilter(filter)
      .filter(file => {
        const docTypes = ['application/pdf', 'application/msword', 'application/vnd.ms-excel', 'text/plain'];
        return docTypes.some(type => file.mimeType.includes(type));
      }) as DocumentFile[];
    
    // Filtrar por categoría si se especifica
    if (category) {
      docs = docs.filter(doc => doc.categories.includes(category));
    }
    
    // Ordenar por fecha de creación (más reciente primero)
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };
  
  // Categorizar un documento
  const categorizeDocument = async (documentId: string, category: string): Promise<boolean> => {
    // Obtener el documento
    const doc = getFilesByFilter({ isDeleted: false }).find(f => f.id === documentId);
    
    if (!doc) {
      throw new Error(`Documento con id ${documentId} no encontrado`);
    }
    
    // Agregar categoría si no existe
    if (!doc.categories.includes(category)) {
      const updatedCategories = [...doc.categories, category];
      await updateFileMetadata(documentId, { categories: updatedCategories });
    }
    
    return true;
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
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}; 