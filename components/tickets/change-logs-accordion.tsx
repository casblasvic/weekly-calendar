"use client";

import React from 'react';
import { useChangeLogs } from '@/lib/hooks/use-change-logs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChangeLogsTable } from '@/components/change-logs-table';

interface ChangeLogsProps {
  entityId: string;
}

export function ChangeLogsAccordion({ entityId }: ChangeLogsProps) {
  const { data: logsRaw = [], isLoading } = useChangeLogs('TICKET', entityId);
  const [orderDesc, setOrderDesc] = React.useState(true);
  const logs = React.useMemo(() => {
    const sorted = logsRaw.slice().sort((a,b)=> new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return orderDesc ? sorted : sorted.reverse();
  }, [logsRaw, orderDesc]);

  const count = logs.length;

  return (
    <Accordion type="single" collapsible className="w-full border rounded-md">
      <AccordionItem value="logs">
        <AccordionTrigger className="px-4 py-2 font-medium text-left flex justify-between items-center" onClick={(e)=>e.stopPropagation()}>
          <span onClick={()=>setOrderDesc(p=>!p)} className="cursor-pointer select-none flex items-center gap-1">
            Historial de cambios
            {orderDesc ? <span>▼</span> : <span>▲</span>}
          </span>
          {count > 0 && <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 rounded-full">{count}</span>}
        </AccordionTrigger>
        <AccordionContent className="p-4 border-t">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/> Cargando...</div>
          ) : (
            <ChangeLogsTable logs={logs} initialDesc={orderDesc} />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
} 