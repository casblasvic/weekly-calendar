import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  itemType?: string;
}

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  itemType?: string;
}

const PAGE_SIZES = [10, 20, 50, 100];

// ✅ NUEVO: Componente separado para selector de filas
export const PageSizeSelector: React.FC<{
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  itemType?: string;
}> = ({ 
  pageSize,
  onPageSizeChange,
  itemType = 'elementos'
}) => {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <span>Mostrar</span>
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger className="w-[70px] h-8">
          <SelectValue placeholder={pageSize} />
        </SelectTrigger>
        <SelectContent side="top">
          {[10, 15, 20, 30, 50].map(size => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>{itemType} por página</span>
    </div>
  );
};

// ✅ MODIFICADO: Componente de paginación sin selector de filas
export const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  itemType = 'resultados'
}) => {
  const handleFirst = () => onPageChange(1);
  const handlePrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const handleLast = () => onPageChange(totalPages);

  const canPreviousPage = currentPage > 1;
  const canNextPage = currentPage < totalPages;
  const displayTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex items-center justify-center space-x-1">
      <Button 
        variant="ghost"
        size="sm" 
        onClick={handleFirst} 
        disabled={!canPreviousPage}
        aria-label="Primera página"
        className="text-gray-600 hover:text-purple-600"
      >
        <ChevronsLeft size={16} />
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        onClick={handlePrevious} 
        disabled={!canPreviousPage}
        aria-label="Página anterior"
        className="text-gray-600 hover:text-purple-600"
      >
        <ChevronLeft size={16} />
      </Button>
      <span className="px-4 py-1.5 text-sm font-medium text-muted-foreground">
        Página {currentPage} de {displayTotalPages}
      </span>
      <Button 
        variant="ghost"
        size="sm" 
        onClick={handleNext} 
        disabled={!canNextPage}
        aria-label="Página siguiente"
        className="text-gray-600 hover:text-purple-600"
      >
        <ChevronRight size={16} />
      </Button>
      <Button 
        variant="ghost"
        size="sm" 
        onClick={handleLast} 
        disabled={!canNextPage}
        aria-label="Última página"
        className="text-gray-600 hover:text-purple-600"
      >
        <ChevronsRight size={16} />
      </Button>
    </div>
  );
}; 