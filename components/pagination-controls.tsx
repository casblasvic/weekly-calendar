import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { type Table } from '@tanstack/react-table';

interface PaginationControlsProps {
  table: Table<any>;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  table 
}) => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalPages = table.getPageCount();
  const currentPage = pageIndex + 1;

  const handleFirst = () => table.setPageIndex(0);
  const handlePrevious = () => table.previousPage();
  const handleNext = () => table.nextPage();
  const handleLast = () => table.setPageIndex(totalPages - 1);

  return (
    <div className="flex items-center justify-end py-4 space-x-2">
      <div className="flex items-center space-x-1">
        <Button 
          variant="ghost"
          size="sm" 
          onClick={handleFirst} 
          disabled={!table.getCanPreviousPage()}
          aria-label="Primera página"
          className="text-gray-600 hover:text-purple-600"
        >
          <ChevronsLeft size={16} />
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={handlePrevious} 
          disabled={!table.getCanPreviousPage()}
          aria-label="Página anterior"
          className="text-gray-600 hover:text-purple-600"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="px-4 py-1.5 text-sm font-medium text-muted-foreground">
          Página {currentPage} de {Math.max(1, totalPages)}
        </span>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={handleNext} 
          disabled={!table.getCanNextPage()}
          aria-label="Página siguiente"
          className="text-gray-600 hover:text-purple-600"
        >
          <ChevronRight size={16} />
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          onClick={handleLast} 
          disabled={!table.getCanNextPage()}
          aria-label="Última página"
          className="text-gray-600 hover:text-purple-600"
        >
          <ChevronsRight size={16} />
        </Button>
      </div>
    </div>
  );
}; 