"use client"

import React from 'react'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Save, HelpCircle, X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog'

interface ActionButtonsProps {
  // Callbacks
  onBack?: () => void
  onSave?: () => Promise<void> | void
  onCancel?: () => void
  
  // Contenido del diálogo de ayuda
  helpTitle?: string
  helpContent?: React.ReactNode
  
  // Estados
  isSaving?: boolean
  isDisabled?: boolean
  
  // Textos personalizados
  backText?: string
  saveText?: string
  cancelText?: string
  helpTooltip?: string
  
  // Estilos
  className?: string
  fixed?: boolean // Si debe fijarse en la parte inferior
  alignment?: 'between' | 'end' | 'center' // Alineación de los botones
}

export function ActionButtons({
  // Callbacks
  onBack,
  onSave,
  onCancel,
  
  // Contenido de ayuda
  helpTitle = 'Ayuda',
  helpContent,
  
  // Estados
  isSaving = false,
  isDisabled = false,
  
  // Textos
  backText = 'Volver',
  saveText = 'Guardar',
  cancelText = 'Cancelar',
  helpTooltip = 'Mostrar ayuda',
  
  // Estilos
  className,
  fixed = false,
  alignment = 'between'
}: ActionButtonsProps) {
  const alignmentClasses = {
    between: 'justify-between',
    end: 'justify-end space-x-2',
    center: 'justify-center space-x-2'
  }

  const containerClasses = cn(
    'flex items-center',
    alignmentClasses[alignment],
    fixed ? 'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : '',
    className
  )

  // Estilos condicionales para el contenedor fijo
  const fixedStyles = fixed ? {
    left: 'var(--sidebar-width, 0px)',
  } : {}

  return (
    <div className={containerClasses} style={fixedStyles}>
      <div className="flex items-center space-x-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isDisabled || isSaving}
            className="flex items-center gap-1 border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1 text-gray-700" />
            {backText}
          </Button>
        )}
        
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDisabled || isSaving}
            className="flex items-center gap-1 border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            <X className="w-4 h-4 mr-1 text-gray-700" />
            {cancelText}
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {onSave && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={isDisabled || isSaving}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                <span className="text-white">Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1 text-white" />
                <span className="text-white">{saveText}</span>
              </>
            )}
          </Button>
        )}
        
        {helpContent && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{helpTitle}</DialogTitle>
                      <DialogDescription asChild>
                        <div className="mt-4">
                          {helpContent}
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>{helpTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
} 