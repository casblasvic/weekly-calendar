import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}) => {

  const handleFirst = () => onPageChange(1);
  const handlePrevious = () => onPageChange(Math.max(1, currentPage - 1));
  const handleNext = () => onPageChange(Math.min(totalPages, currentPage + 1));
  const handleLast = () => onPageChange(totalPages);

  if (totalPages <= 1) {
    return null; // No mostrar controles si hay 1 página o menos
  }

  return (
    <div className="flex items-center space-x-1">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleFirst} 
        disabled={currentPage === 1}
        aria-label="Primera página"
      >
        <ChevronsLeft size={16} />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handlePrevious} 
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft size={16} />
      </Button>
      <span className="px-4 py-1.5 text-sm font-medium text-gray-700">
        Página {currentPage} / {totalPages}
      </span>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleNext} 
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
      >
        <ChevronRight size={16} />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleLast} 
        disabled={currentPage === totalPages}
        aria-label="Última página"
      >
        <ChevronsRight size={16} />
      </Button>
    </div>
  );
}; 