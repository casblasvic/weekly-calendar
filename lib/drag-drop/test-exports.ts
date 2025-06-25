// Archivo temporal para verificar exportaciones
import { useOptimizedDragAndDrop, useLocalDragPreview, useGlobalDragState } from './optimized-hooks';

// Esta importación verificará que las exportaciones estén funcionando
export const verifyExports = () => {
  console.log('Exportaciones verificadas:', { 
    useOptimizedDragAndDrop, 
    useLocalDragPreview, 
    useGlobalDragState 
  });
}; 