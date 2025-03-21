import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Trash2, Download, Eye, Plus } from 'lucide-react';
import { DocumentFile } from '@/contexts/file-context';
import FileUploader from './file-uploader';

interface DocumentListProps {
  documents: DocumentFile[];
  onAddDocuments?: (files: File[]) => Promise<void>;
  onRemove?: (documentId: string) => Promise<void>;
  onView?: (document: DocumentFile) => void;
  editable?: boolean;
  className?: string;
  compact?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents = [],
  onAddDocuments,
  onRemove,
  onView,
  editable = false,
  className,
  compact = false
}) => {
  // Si no hay documentos, mostrar estado vacío
  if (documents.length === 0) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4",
        "border border-dashed border-gray-200",
        className
      )}>
        <FileText className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500 mb-3">No hay documentos disponibles</p>
        
        {editable && onAddDocuments && (
          <FileUploader
            accept=".pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={true}
            variant="compact"
            onUpload={onAddDocuments}
          />
        )}
      </div>
    );
  }
  
  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Documentos ({documents.length})</h4>
          {editable && onAddDocuments && (
            <FileUploader
              accept=".pdf,application/pdf,.doc,.docx"
              multiple={true}
              variant="compact"
              onUpload={onAddDocuments}
            />
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {documents.map((doc) => (
            <div 
              key={doc.id}
              className="relative flex items-center p-2 border rounded-md hover:bg-gray-50 group"
            >
              <div 
                className="flex items-center flex-1 min-w-0 cursor-pointer"
                onClick={() => onView && onView(doc)}
              >
                <FileText className={cn(
                  "h-4 w-4 mr-2 flex-shrink-0",
                  doc.mimeType.includes("pdf") ? "text-red-500" : 
                  doc.mimeType.includes("word") ? "text-blue-500" : 
                  "text-gray-500"
                )} />
                <span className="text-xs truncate flex-1">{doc.fileName}</span>
              </div>
              
              {editable && onRemove && (
                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(doc.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">Documentos</h4>
        {editable && onAddDocuments && (
          <FileUploader
            accept=".pdf,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple={true}
            variant="compact"
            onUpload={onAddDocuments}
          />
        )}
      </div>
      
      {documents.map((doc) => (
        <div 
          key={doc.id}
          className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50"
        >
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-md flex-shrink-0",
            doc.mimeType.includes("pdf") ? "bg-red-100" : 
            doc.mimeType.includes("word") ? "bg-blue-100" : 
            "bg-gray-100"
          )}>
            <FileText className={cn(
              "h-6 w-6",
              doc.mimeType.includes("pdf") ? "text-red-500" : 
              doc.mimeType.includes("word") ? "text-blue-500" : 
              "text-gray-500"
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.fileName}</p>
            <p className="text-xs text-gray-500">
              {(doc.fileSize / 1024).toFixed(1)} KB • 
              {new Date(doc.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {onView && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={() => onView(doc)}
              >
                <Eye className="h-4 w-4 text-gray-400 hover:text-blue-500" />
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0" 
              onClick={() => window.open(doc.url, '_blank')}
            >
              <Download className="h-4 w-4 text-gray-400 hover:text-green-500" />
            </Button>
            
            {editable && onRemove && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0" 
                onClick={() => onRemove(doc.id)}
              >
                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentList; 