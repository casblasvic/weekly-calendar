import { useState, useEffect } from 'react';

interface CanInvoiceResponse {
  canInvoice: boolean;
  reason?: string;
  message?: string;
  legalEntity?: any;
  client?: any;
  company?: any;
  availableSeries?: any[];
  defaultSeriesId?: string;
  ticket?: any;
}

export function useCanInvoice(ticketId: string | null) {
  const [data, setData] = useState<CanInvoiceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkCanInvoice = async () => {
    if (!ticketId) {
      console.warn('[useCanInvoice] No ticketId provided');
      return;
    }
    
    console.log('[useCanInvoice] Fetching data for ticket:', ticketId);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tickets/${ticketId}/can-invoice`);
      const result = await response.json();
      
      console.log('[useCanInvoice] Response received:', {
        canInvoice: result.canInvoice,
        hasTicket: !!result.ticket,
        hasLegalEntity: !!result.legalEntity,
        availableSeriesCount: result.availableSeries?.length || 0
      });
      
      if (!response.ok) {
        setError(result.message || 'Error al verificar facturación');
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Error de conexión');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ticketId) {
      setData(null);
      return;
    }

    checkCanInvoice();
  }, [ticketId]);

  return { data, loading, error, refetch: checkCanInvoice };
}
