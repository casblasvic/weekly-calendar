"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CancelPaymentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CancelPaymentModal({ open, onOpenChange, onConfirm, isSubmitting = false }: CancelPaymentModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');

  const handleConfirm = async () => {
    if (reason.trim().length < 3) {
      toast({ variant: 'destructive', title: 'Motivo requerido', description: 'Por favor escribe un motivo de al menos 3 caracteres.' });
      return;
    }
    await onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting) onOpenChange(v);} }>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Anular liquidación</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-gray-600">Indica el motivo de la anulación:</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" rows={4} />
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
            Confirmar anulación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
