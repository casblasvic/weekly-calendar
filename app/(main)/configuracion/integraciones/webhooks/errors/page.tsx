"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RefreshCw, Play, ArrowLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion"
import { cn } from '@/lib/utils';

interface ErrorLog {
  id: string;
  method: string;
  statusCode: number | null;
  createdAt: string;
  processingError?: string;
  webhook: {
    id: string;
    name: string;
    slug: string;
  };
  headers?: any;
  body?: any;
  responseBody?: any;
}

export default function WebhookErrorsPage() {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchErrorLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/internal/webhooks/all-logs?filter=errors');
      if (!response.ok) {
        throw new Error("No se pudieron cargar los logs de errores");
      }
      const data = await response.json();
      setErrorLogs(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchErrorLogs();
  }, [fetchErrorLogs]);

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
      fetchErrorLogs();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/configuracion/integraciones/webhooks">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Logs de Errores de Webhooks</h1>
                <p className="text-muted-foreground mt-1">
                Registro centralizado de todas las peticiones de webhooks que han fallado.
                </p>
            </div>
        </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Todos los Errores</CardTitle>
                <CardDescription>Peticiones de todos los webhooks que han resultado en un error.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchErrorLogs} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
          {!isLoading && errorLogs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">¡Felicidades! No hay errores en los logs.</div>
          )}
          {!isLoading && errorLogs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <TableRow>
                      <TableCell>
                        <div className="font-medium">{log.webhook.name}</div>
                        <div className="text-xs text-muted-foreground">{log.webhook.slug}</div>
                      </TableCell>
                      <TableCell>{log.method}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{log.statusCode || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRerunLog(log.id)}>
                          <Play className="h-4 w-4" />
                        </Button>
                         <Button variant="ghost" size="sm" onClick={() => setExpandedRowId(expandedRowId === log.id ? null : log.id)}>
                            <ChevronRight className={cn("h-4 w-4 transition-transform", expandedRowId === log.id && "rotate-90")} />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <AnimatePresence>
                      {expandedRowId === log.id && (
                        <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                          <TableCell colSpan={5} className="p-0">
                             <div className="bg-muted/50 p-4 space-y-4">
                                <h4 className="font-semibold">Detalles del Error</h4>
                                {log.processingError && <div className="p-2 bg-red-100 text-red-800 rounded"><strong>Error:</strong> {log.processingError}</div>}
                                <div>
                                    <h5 className="font-medium text-sm mb-1">Body Recibido</h5>
                                    <pre className="text-xs bg-background p-2 rounded max-h-40 overflow-auto">{JSON.stringify(log.body, null, 2)}</pre>
                                </div>
                             </div>
                          </TableCell>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 