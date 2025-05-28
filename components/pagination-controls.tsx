import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalCount: number;
  itemType?: string;
}

const PAGE_SIZES = [10, 20, 50, 100];

export const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
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

  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 space-y-2 sm:space-y-0 sm:space-x-4">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {/* <span>Mostrar</span> -- Removed by Cascade */}
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {PAGE_SIZES.map(size => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* <span>elementos por página.</span> -- Removed by Cascade */}
      </div>

      <div className="flex items-center space-x-1">
        {/* <span className="text-sm text-muted-foreground hidden md:inline-block">
          {totalCount > 0 ? `Mostrando ${startItem}-${endItem} de ${totalCount} ${itemType}` : `No hay ${itemType}`}
        </span> -- Removed by Cascade */}
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
       {/* <span className="text-sm text-muted-foreground md:hidden">
          {totalCount > 0 ? `${startItem}-${endItem} de ${totalCount}` : `No hay ${itemType}`}
        </span> -- Removed by Cascade */}
    </div>
  );
}; 