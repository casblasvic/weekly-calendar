import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaveButtonProps {
  isSaving: boolean;
  disabled?: boolean;
  onClick?: () => void;
  form?: string;
  type?: 'button' | 'submit';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  saveText?: string;
  savingText?: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaving,
  disabled = false,
  onClick,
  form,
  type = 'submit',
  variant = 'default',
  size = 'default',
  className,
  children,
  saveText = 'Guardar Cambios',
  savingText = 'Guardando...'
}) => {
  return (
    <Button
      type={type}
      form={form}
      onClick={onClick}
      disabled={isSaving || disabled}
      variant={variant}
      size={size}
      className={className}
    >
      <Save 
        className={cn(
          "w-4 h-4 mr-2", 
          isSaving && "animate-spin"
        )} 
      />
      {children || (isSaving ? savingText : saveText)}
    </Button>
  );
}; 