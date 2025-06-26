"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CheckCircle, XCircle, Loader2, RefreshCw, ChevronRight, Play, Trash2, Filter } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { PaginationControls } from "@/components/pagination-controls"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

interface WebhookLogsPanelProps {
  webhookId: string;
  initialLogs?: WebhookLog[];
  isLoading?: boolean;
}

export interface WebhookLog {
  id: string;
  isSuccess: boolean;
  method: string;
  url: string;
  statusCode: number | null;
  createdAt: string;
  processingError?: string;
  headers?: any;
  body?: any;
  responseBody?: any;
  durationMs?: number;
}

export function WebhookLogsPanel({ webhookId, initialLogs, isLoading: initialIsLoading }: WebhookLogsPanelProps) {
  const [logs, setLogs] = useState<WebhookLog[]>(initialLogs || []);
  const [isLoading, setIsLoading] = useState(initialIsLoading ?? true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    if (!webhookId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/internal/webhooks/${webhookId}/logs?filter=${filter}&page=${page}&pageSize=${pageSize}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar los logs");
      }
      const data = await response.json();
      setLogs(data.logs);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [webhookId, filter, page, pageSize]);

  useEffect(() => {
    if (initialLogs === undefined || page > 1 || pageSize > 10 || filter !== 'all') {
      fetchLogs();
    } else {
        setTotalCount(initialLogs.length)
    }
  }, [fetchLogs, initialLogs, page, pageSize, filter]);

  const handleRerunLog = async (logId: string) => {
    toast.info("Re-ejecutando el log...");
    try {
      const response = await fetch(`/api/internal/webhook-logs/${logId}/rerun`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Error al re-ejecutar el log");
      }
      toast.success("Log re-ejecutado con éxito. Refrescando...");
      fetchLogs(); // Refrescar la lista de logs
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  
  const handleDeleteAllLogs = async () => {
      if (!confirm("¿Estás seguro de que quieres eliminar TODOS los logs de este webhook? Esta acción no se puede deshacer.")) {
          return;
      }
      toast.info("Eliminando logs...");
      try {
          const response = await fetch(`/api/internal/webhooks/${webhookId}/logs`, {
              method: 'DELETE',
          });
          if (!response.ok) {
              throw new Error("Error al eliminar los logs");
          }
          toast.success("Todos los logs han sido eliminados.");
          fetchLogs();
      } catch (err: any) {
          toast.error(err.message);
      }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogIds.size === 0) return;
    
    try {
      const response = await fetch(`/api/internal/webhook-logs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedLogIds) }),
      });

      if (response.ok) {
        toast.success(`${selectedLogIds.size} logs eliminados correctamente.`);
        setSelectedLogIds(new Set());
        fetchLogs(); // Recargar logs
      } else {
        toast.error("Error al eliminar los logs.");
      }
    } catch (error) {
      toast.error("Error de red al eliminar los logs.");
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(logs.map(log => log.id));
      setSelectedLogIds(allIds);
    } else {
      setSelectedLogIds(new Set());
    }
  };

  const handleSelectLog = (logId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedLogIds);
    if (checked) {
      newSelectedIds.add(logId);
    } else {
      newSelectedIds.delete(logId);
    }
    setSelectedLogIds(newSelectedIds);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Historial de Logs</CardTitle>
          <CardDescription>Registro de todas las peticiones recibidas por este webhook.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>{filter === 'all' ? 'Todos' : 'Solo Errores'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setFilter('all')}>Todos</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFilter('errors')}>Solo Errores</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteAllLogs}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedLogIds.size === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar ({selectedLogIds.size})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
        {!isLoading && error && <div className="text-center py-8 text-red-500">{error}</div>}
        {!isLoading && !error && logs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No hay logs para mostrar.</div>
        )}
        {!isLoading && !error && logs.length > 0 && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLogIds.size > 0 && selectedLogIds.size === logs.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duración</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow 
                      className="cursor-pointer" 
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLogIds.has(log.id)}
                          onCheckedChange={(checked) => handleSelectLog(log.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.isSuccess ? "default" : "destructive"}>
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.method}</TableCell>
                      <TableCell>
                        <Badge variant={log.statusCode && log.statusCode >= 400 ? "destructive" : "secondary"}>
                          {log.statusCode || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}</TableCell>
                      <TableCell>
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </TableCell>
                    </TableRow>
                    {expandedLogId === log.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="p-4 bg-muted">
                            <h4 className="font-semibold">Detalles del Log</h4>
                            {log.processingError && (
                               <div className="p-2 bg-red-100 text-red-800 rounded"><strong>Error de Procesamiento:</strong> {log.processingError}</div>
                            )}
                            <div>
                                <h5 className="font-medium text-sm mb-1">Headers</h5>
                                <pre className="text-xs bg-background p-2 rounded max-h-40 overflow-auto">
                                  {JSON.stringify(log.headers, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <h5 className="font-medium text-sm mb-1">Body Recibido</h5>
                                <pre className="text-xs bg-background p-2 rounded max-h-40 overflow-auto">
                                  {JSON.stringify(log.body, null, 2)}
                                </pre>
                            </div>
                             <div>
                                <h5 className="font-medium text-sm mb-1">Respuesta Enviada</h5>
                                <pre className="text-xs bg-background p-2 rounded max-h-40 overflow-auto">
                                  {JSON.stringify(log.responseBody, null, 2)}
                                </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
                currentPage={page}
                totalPages={Math.ceil(totalCount / pageSize)}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalCount={totalCount}
                itemType="logs"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
} 