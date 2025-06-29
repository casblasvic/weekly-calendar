'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  MessageSquare,
  Zap,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';

interface WebSocketLog {
  id: string;
  connectionId: string;
  eventType: string;
  message: string | null;
  errorDetails: string | null;
  metadata: any;
  responseTime: number | null;
  dataSize: number | null;
  clientIp: string | null;
  userAgent: string | null;
  createdAt: string;
  connection: {
    type: string;
    referenceId: string;
    status: string;
    metadata: any;
  };
}

interface LogFilters {
  connectionType: string;
  eventType: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

export default function WebSocketLogs() {
  const [logs, setLogs] = useState<WebSocketLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<LogFilters>({
    connectionType: 'all',
    eventType: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Construir query params
      const params = new URLSearchParams();
      if (filters.connectionType !== 'all') params.append('type', filters.connectionType);
      if (filters.eventType !== 'all') params.append('eventType', filters.eventType);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('limit', '100'); // Últimos 100 logs
      
      const response = await fetch(`/api/websocket/logs?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data.logs || []);
        // Limpiar selección al recargar
        setSelectedLogs(new Set());
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Error al cargar los logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          log.message?.toLowerCase().includes(searchLower) ||
          log.errorDetails?.toLowerCase().includes(searchLower) ||
          log.connection.referenceId.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [logs, filters.search]);

  // Funciones de selección
  const toggleSelectAll = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  const toggleSelectLog = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  // Función de eliminación
  const deleteLogs = async (logIds: string[] | 'all') => {
    try {
      setDeleting(true);
      
      const requestBody = logIds === 'all' 
        ? {
            action: 'delete_all',
            confirm: true
          }
        : {
            action: 'delete',
            ids: logIds
          };
      
      const response = await fetch('/api/websocket/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();
      
      if (result.success) {
        const deletedCount = result.data?.deletedCount || (logIds === 'all' ? logs.length : logIds.length);
        toast.success(`${deletedCount} log(s) eliminado(s) correctamente`);
        
        // Recargar logs
        await fetchLogs();
      } else {
        throw new Error(result.error || 'Error al eliminar logs');
      }
    } catch (error) {
      console.error('Error deleting logs:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar logs');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLogs.size === 0) return;
    
    const logIds = Array.from(selectedLogs);
    if (confirm(`¿Estás seguro de que quieres eliminar ${logIds.length} log(s) seleccionado(s)?`)) {
      deleteLogs(logIds);
    }
  };

  const handleDeleteAll = () => {
    const totalLogs = logs.length; // Usar logs totales, no filtrados
    if (confirm(`¿Estás seguro de que quieres eliminar TODOS los logs del sistema?\n\n• Se eliminarán ${totalLogs} logs en total\n• Esta acción no se puede deshacer\n• Se eliminarán TODOS los logs, no solo los mostrados actualmente\n\n¿Continuar?`)) {
      deleteLogs('all');
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'connect': return <Wifi className="w-4 h-4 text-green-600" />;
      case 'disconnect': return <WifiOff className="w-4 h-4 text-gray-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'ping': return <Zap className="w-4 h-4 text-yellow-600" />;
      case 'reconnect': return <RefreshCw className="w-4 h-4 text-orange-600" />;
      case 'reconnect_skipped': return <RefreshCw className="w-4 h-4 text-gray-600" />;
      case 'action': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'action_success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'action_error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'config_change': return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'connect': return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnect': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'message': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ping': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reconnect': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reconnect_skipped': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'action': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'action_success': return 'bg-green-100 text-green-800 border-green-200';
      case 'action_error': return 'bg-red-100 text-red-800 border-red-200';
      case 'config_change': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportLogs = () => {
    const csvContent = [
      'Fecha,Tipo Conexión,Evento,Mensaje,Error,IP Cliente',
      ...filteredLogs.map(log => [
        formatTime(log.createdAt),
        log.connection.type,
        log.eventType,
        log.message || '',
        log.errorDetails || '',
        log.clientIp || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `websocket-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const isAllSelected = selectedLogs.size === filteredLogs.length && filteredLogs.length > 0;
  const isPartialSelected = selectedLogs.size > 0 && selectedLogs.size < filteredLogs.length;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Logs de WebSocket en Tiempo Real</CardTitle>
              <CardDescription>
                Historial de eventos y errores de las conexiones WebSocket
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={filteredLogs.length === 0}
              >
                <Download className="mr-2 w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Tipo de Conexión</label>
              <Select
                value={filters.connectionType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, connectionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="SHELLY">Shelly</SelectItem>
                  <SelectItem value="SOCKET_IO">Socket.IO</SelectItem>
                  <SelectItem value="TEST">Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">Tipo de Evento</label>
              <Select
                value={filters.eventType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, eventType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="connect">Conexión</SelectItem>
                  <SelectItem value="disconnect">Desconexión</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="message">Mensaje</SelectItem>
                  <SelectItem value="ping">Ping</SelectItem>
                  <SelectItem value="reconnect">Reconexión</SelectItem>
                  <SelectItem value="reconnect_skipped">Reconexión Omitida</SelectItem>
                  <SelectItem value="action">Acción</SelectItem>
                  <SelectItem value="action_success">Acción Exitosa</SelectItem>
                  <SelectItem value="action_error">Error de Acción</SelectItem>
                  <SelectItem value="config_change">Cambio Config</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
                <Input
                  placeholder="Buscar en mensajes..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={fetchLogs}
                disabled={loading}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
          
          {lastUpdate && (
            <p className="mt-4 text-sm text-muted-foreground">
              Última actualización: {lastUpdate.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Eventos Recientes ({filteredLogs.length})
            </CardTitle>
            
            {/* Controles de eliminación */}
            {filteredLogs.length > 0 && (
              <div className="flex gap-2 items-center">
                {selectedLogs.size > 0 && (
                  <>
                    <Badge variant="secondary">
                      {selectedLogs.size} seleccionado(s)
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                    >
                      <Trash2 className="mr-2 w-4 h-4" />
                      Eliminar Seleccionados
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteAll}
                  disabled={deleting || filteredLogs.length === 0}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Eliminar Todos
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading && logs.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="mr-2 w-8 h-8 animate-spin" />
                <span>Cargando logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Filter className="mx-auto mb-2 w-12 h-12 opacity-50" />
                <p>No hay logs que coincidan con los filtros</p>
              </div>
            ) : (
              <div className="relative">
                {/* Header de selección FIJO */}
                <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                  <div className="flex gap-3 items-center p-3 bg-gray-50 rounded-t-lg">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      {isAllSelected ? 'Deseleccionar todo' : isPartialSelected ? 'Seleccionar todo' : 'Seleccionar todo'}
                    </span>
                    {selectedLogs.size > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({selectedLogs.size} de {filteredLogs.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Lista de logs con padding superior para compensar header fijo */}
                <div className="pt-2 space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                        selectedLogs.has(log.id) 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedLogs.has(log.id)}
                        onCheckedChange={() => toggleSelectLog(log.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(log.eventType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2 items-center mb-1">
                          <Badge className={`text-xs ${getEventColor(log.eventType)}`}>
                            {log.eventType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {log.connection.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                        
                        {log.message && (
                          <p className="mb-1 text-sm text-gray-900">
                            {log.message}
                          </p>
                        )}
                        
                        {log.errorDetails && (
                          <p className="mb-1 text-sm text-red-600">
                            Error: {log.errorDetails}
                          </p>
                        )}
                        
                        <div className="flex gap-4 items-center text-xs text-muted-foreground">
                          <span>ID: {log.connectionId.slice(0, 8)}...</span>
                          {log.responseTime && (
                            <span>Tiempo: {log.responseTime}ms</span>
                          )}
                          {log.clientIp && (
                            <span>IP: {log.clientIp}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 