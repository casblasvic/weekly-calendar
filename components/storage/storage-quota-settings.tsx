import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { HardDrive, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { getClinics } from '@/mockData';
import { useStorage } from '@/contexts/storage-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface StorageQuotaSettingsProps {
  onCancel?: () => void;
  onSave?: (size: number, isUnlimited: boolean) => void;
  advancedMode?: boolean;
  systemTotal?: number;
  showTotalInfo?: boolean;
}

const BYTES_IN_GB = 1024 * 1024 * 1024;
const BYTES_IN_MB = 1024 * 1024;
const DEFAULT_SYSTEM_TOTAL = 1024 * 1024 * 1024 * 1024; // 1TB

const StorageQuotaSettings: React.FC<StorageQuotaSettingsProps> = ({
  onCancel,
  onSave,
  advancedMode = false,
  systemTotal: propSystemTotal,
  showTotalInfo = false
}) => {
  // Extraemos las funciones del contexto solo una vez
  const storageContext = useStorage();
  
  // Obtener datos iniciales de una sola vez con useMemo para evitar recálculos
  const initialData = useMemo(() => {
    try {
      const settings = storageContext.getQuotaSettings();
      const globalQuota = storageContext.getQuota('global');
      const clinicQuotas = storageContext.getClinicQuotas();
      const availableClinics = getClinics();
      
      console.log("StorageQuotaSettings - Clínicas disponibles:", availableClinics);
      console.log("StorageQuotaSettings - Cuotas de clínicas:", clinicQuotas);
      
      // Calcular total asignado
      let assignedTotal = 0;
      clinicQuotas.forEach(quota => {
        if (!quota.isUnlimited) {
          assignedTotal += quota.quotaSize;
        }
      });
      
      return {
        settings,
        globalQuota,
        clinicQuotas,
        clinics: availableClinics,
        totalAssigned: assignedTotal
      };
    } catch (error) {
      console.error("Error getting initial data:", error);
      return {
        settings: { mode: 'global', defaultQuotaSize: DEFAULT_SYSTEM_TOTAL, defaultIsUnlimited: false },
        globalQuota: { id: 'global', entityType: 'global', quotaSize: DEFAULT_SYSTEM_TOTAL, isUnlimited: false },
        clinicQuotas: [],
        clinics: [],
        totalAssigned: 0
      };
    }
  }, [storageContext]);
  
  // Estado para almacenar los datos
  const [clinics, setClinics] = useState(initialData.clinics);
  const [clinicQuotas, setClinicQuotas] = useState(initialData.clinicQuotas);
  const [totalAssigned, setTotalAssigned] = useState(initialData.totalAssigned);
  
  // Estados para el formulario
  const [sizeValue, setSizeValue] = useState<string>('');
  const [sizeUnit, setSizeUnit] = useState('GB');
  const [unlimited, setUnlimited] = useState(initialData.globalQuota.isUnlimited);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Nueva implementación para manejar selección de clínicas
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);

  // Usar el systemTotal proporcionado como prop o el valor por defecto
  const systemTotal = propSystemTotal || DEFAULT_SYSTEM_TOTAL;
  
  // Función para refrescar la lista de clínicas
  const refreshClinics = useCallback(() => {
    try {
      const freshClinics = getClinics();
      console.log("Refrescando lista de clínicas:", freshClinics);
      setClinics(freshClinics);
    } catch (error) {
      console.error("Error al refrescar lista de clínicas:", error);
    }
  }, []);
  
  // Cargar clínicas al montar el componente
  useEffect(() => {
    refreshClinics();
  }, [refreshClinics]);
  
  // Validar que la cuota no exceda el límite del sistema
  useEffect(() => {
    if (!unlimited) {
      const numericValue = parseFloat(sizeValue) || 0;
      let sizeInBytes = numericValue;
      if (sizeUnit === 'GB') {
        sizeInBytes = numericValue * BYTES_IN_GB;
      } else if (sizeUnit === 'MB') {
        sizeInBytes = numericValue * BYTES_IN_MB;
      }
      
      // Para cuotas múltiples, verificar el espacio total
      const totalRequired = sizeInBytes * selectedClinics.length;
      const currentClinicQuotasTotal = selectedClinics.reduce((acc, clinicId) => {
        const quota = clinicQuotas.find(q => q.entityId === clinicId);
        if (quota && !quota.isUnlimited) {
          return acc + quota.quotaSize;
        }
        return acc;
      }, 0);
      
      // Calcular espacio disponible restando cuotas existentes y sumando las que vamos a modificar
      const availableSpace = systemTotal - (totalAssigned - currentClinicQuotasTotal);
      
      if (totalRequired > availableSpace) {
        setError(`La cuota excede el espacio disponible. Máximo disponible: ${formatBytes(availableSpace)}`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [sizeValue, sizeUnit, unlimited, totalAssigned, selectedClinics, clinicQuotas, systemTotal]);
  
  // Cache de estadísticas para evitar recálculos repetidos
  const statsCache = useMemo(() => {
    const cache: Record<string, any> = {};
    
    // Pre-calcular estadísticas para todas las clínicas
    clinics.forEach(clinic => {
      try {
        const clinicId = clinic.id.toString();
        const stats = storageContext.getStorageStats(clinicId);
        cache[clinicId] = stats;
      } catch (error) {
        console.error(`Error calculating stats for clinic ${clinic.id}:`, error);
      }
    });
    
    return cache;
  }, [clinics, storageContext]);
  
  // Obtener estadísticas de uso de forma segura y cacheada
  const getClinicStats = useCallback((clinicId: string) => {
    // Usar estadísticas cacheadas
    if (statsCache[clinicId]) {
      return statsCache[clinicId];
    }
    
    // Estadísticas por defecto si no hay caché
    return {
      used: 0,
      quota: systemTotal,
      isUnlimited: false,
      percentUsed: 0,
      byType: {},
      byEntityType: {}
    };
  }, [statsCache, systemTotal]);
  
  // Manejar la selección/deselección de clínicas
  const toggleClinicSelection = (clinicId: string) => {
    // Mostrar feedback visual
    const row = document.querySelector(`tr[data-clinic-id="${clinicId}"]`);
    if (row) {
      row.classList.add('bg-blue-100');
      setTimeout(() => {
        row.classList.remove('bg-blue-100');
      }, 200);
    }
    
    setSelectedClinics(prev => {
      const newSelection = prev.includes(clinicId)
        ? prev.filter(id => id !== clinicId)
        : [...prev, clinicId];
        
      // Si se añade una clínica, también actualizar datos de esa clínica
      if (!prev.includes(clinicId)) {
        const clinicQuota = clinicQuotas.find(q => q.entityId === clinicId);
        
        // Si la clínica tiene una cuota asignada y no es ilimitada, usar su valor
        if (clinicQuota && clinicQuota.id !== 'global' && !clinicQuota.isUnlimited) {
          // Actualizar el valor del tamaño en la unidad actual
          if (sizeUnit === 'GB') {
            setSizeValue(clinicQuota.quotaSize / BYTES_IN_GB);
          } else if (sizeUnit === 'MB') {
            setSizeValue(clinicQuota.quotaSize / BYTES_IN_MB);
          }
          setUnlimited(clinicQuota.isUnlimited);
        }
      }
      
      // Actualizar inmediatamente el atributo de datos
      setTimeout(() => {
        const selectedClinicsElement = document.querySelector('[data-selected-clinics]');
        if (selectedClinicsElement) {
          selectedClinicsElement.setAttribute('data-selected-clinics', JSON.stringify(newSelection));
        }
      }, 0);
      
      return newSelection;
    });
  };

  // Seleccionar o deseleccionar todas las clínicas
  const toggleSelectAll = () => {
    // Mostrar feedback visual
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.classList.add('bg-blue-100');
      setTimeout(() => {
        row.classList.remove('bg-blue-100');
      }, 200);
    });
    
    setSelectedClinics(prev => {
      const newSelection = prev.length === clinics.length
        ? []
        : clinics.map(clinic => clinic.id.toString());
      
      // Actualizar inmediatamente el atributo de datos
      setTimeout(() => {
        const selectedClinicsElement = document.querySelector('[data-selected-clinics]');
        if (selectedClinicsElement) {
          selectedClinicsElement.setAttribute('data-selected-clinics', JSON.stringify(newSelection));
        }
      }, 0);
      
      return newSelection;
    });
  };
  
  const handleSave = () => {
    console.log("Botón Aplicar pulsado - aplicando configuración inmediatamente");
    
    // Comprobar si hay clínicas seleccionadas
    if (selectedClinics.length === 0) {
      toast.warning('No hay clínicas seleccionadas para aplicar configuración');
      return;
    }
    
    // Comprobar errores
    if (error) {
      toast.error('No se puede guardar: ' + error);
      return;
    }
    
    // Mostrar estado de guardado
    setSaving(true);
    
    // Convertir a bytes según la unidad seleccionada
    const numericValue = parseFloat(sizeValue) || 0;
    let sizeInBytes = numericValue;
    if (sizeUnit === 'GB') {
      sizeInBytes = numericValue * BYTES_IN_GB;
    } else if (sizeUnit === 'MB') {
      sizeInBytes = numericValue * BYTES_IN_MB;
    }
    
    console.log(`Aplicando configuración: ${numericValue} ${sizeUnit} = ${formatBytes(sizeInBytes)}, Sin límite: ${unlimited}`);
    console.log(`Clínicas seleccionadas (${selectedClinics.length}): ${selectedClinics.join(', ')}`);
    
    try {
      // Llamar directamente al método onSave para notificar al componente padre
      // Esto es lo más importante para asegurar que el cambio se propague
      if (onSave) {
        console.log("Llamando a onSave del componente padre");
        onSave(sizeInBytes, unlimited);
      }
      
      // Aplicar también los cambios a nivel local
      let success = true;
      
      // Aplicar los cambios para cada clínica seleccionada
      selectedClinics.forEach(clinicId => {
        const result = storageContext.setQuota('clinic', clinicId, sizeInBytes, unlimited);
        if (!result) {
          success = false;
          console.error(`Error al aplicar cuota a clínica ${clinicId}`);
        }
      });
      
      // Actualizar la interfaz con los resultados
      if (success) {
        // Obtener los datos actualizados
        refreshClinics();
        const updatedQuotas = storageContext.getClinicQuotas();
        setClinicQuotas(updatedQuotas);
        
        // Recalcular total asignado
        let assignedTotal = 0;
        updatedQuotas.forEach(quota => {
          if (!quota.isUnlimited) {
            assignedTotal += quota.quotaSize;
          }
        });
        setTotalAssigned(assignedTotal);
        
        toast.success(`Configuración aplicada a ${selectedClinics.length} clínica(s)`);
      } else {
        toast.error('Hubo errores al aplicar la configuración');
      }
    } catch (error) {
      console.error("Error al aplicar configuración:", error);
      toast.error('Error al aplicar la configuración');
    } finally {
      setSaving(false);
    }
  };
  
  // Formatear bytes para visualización
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Calcular el uso en porcentaje de forma segura
  const getUsagePercent = (clinicId: string) => {
    const stats = getClinicStats(clinicId);
    
    // Si la clínica usa cuota global, debemos mostrar el porcentaje respecto al espacio global disponible
    const clinicQuota = clinicQuotas.find(q => q.entityId === clinicId);
    const usesGlobalQuota = !clinicQuota || clinicQuota.id === 'global';
    
    if (stats.isUnlimited) return "0%";
    
    if (usesGlobalQuota) {
      // Para clínicas con cuota global, mostrar el porcentaje respecto al total global disponible
      // reduciendo el espacio ya usado por todas las clínicas
      const usedByAllClinics = Object.values(statsCache).reduce((sum: number, stat: any) => sum + (stat?.used || 0), 0);
      const globalAvailable = systemTotal - usedByAllClinics + (stats?.used || 0); // Restamos todo menos el propio uso
      const percent = globalAvailable > 0 ? Math.min(100, (stats.used / globalAvailable) * 100) : 100;
      return `${Math.round(percent)}%`;
    }
    
    return `${Math.min(100, Math.round(stats.percentUsed))}%`;
  };
  
  // Obtener color según el uso
  const getUsageColor = (clinicId: string) => {
    const stats = getClinicStats(clinicId);
    if (stats.isUnlimited) return "text-green-500";
    
    const percent = stats.percentUsed;
    if (percent < 70) return "text-green-500";
    if (percent < 90) return "text-yellow-500";
    return "text-red-500";
  };
  
  // Renderizar componente con key basado en datos para forzar remontaje cuando cambian
  const tableKey = `table-${JSON.stringify(clinicQuotas)}-${Date.now()}`;
  
  // Efecto para actualizar los datos cuando cambian en el contexto
  useEffect(() => {
    try {
      const settings = storageContext.getQuotaSettings();
      const clinicQuotas = storageContext.getClinicQuotas();
      let assignedTotal = 0;
      
      clinicQuotas.forEach(quota => {
        if (!quota.isUnlimited) {
          assignedTotal += quota.quotaSize;
        }
      });
      
      setClinicQuotas(clinicQuotas);
      setTotalAssigned(assignedTotal);
    } catch (error) {
      console.error("Error actualizando datos:", error);
    }
  }, [storageContext]);
  
  return (
    <Card className="shadow-sm" data-component="storage-quota-settings">
      {showTotalInfo && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Espacio total disponible: {formatBytes(systemTotal)}
          </CardTitle>
          <CardDescription className="text-xs">
            Espacio asignado a clínicas: {formatBytes(totalAssigned)} | 
            Disponible para asignar: {formatBytes(Math.max(0, systemTotal - totalAssigned))}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4 pt-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 md:col-span-2">
            {/* Tamaño de cuota */}
            <div className="space-y-1">
              <Label htmlFor="quota-size" className="text-sm">Tamaño de cuota</Label>
              <div className="flex gap-2">
                <Input 
                  id="quota-size"
                  type="number"
                  min="0"
                  value={sizeValue}
                  onChange={(e) => setSizeValue(e.target.value)}
                  disabled={unlimited}
                  className="h-8"
                  data-test="quota-size-input"
                />
                <Select 
                  value={sizeUnit} 
                  onValueChange={setSizeUnit}
                  disabled={unlimited}
                >
                  <SelectTrigger className="w-20 h-8" data-test="quota-unit-select">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GB">GB</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            {/* Sin límite */}
            <div className="space-y-1">
              <Label htmlFor="unlimited-toggle" className="text-sm">Sin límite</Label>
              <div className="flex items-center h-8 pt-1">
                <Switch 
                  id="unlimited-toggle" 
                  checked={unlimited}
                  onCheckedChange={setUnlimited}
                  data-test="unlimited-toggle"
                />
                <span className="ml-2 text-xs text-gray-600">
                  {unlimited ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </div>
          <div className="md:col-span-1">
            {/* Botón aplicar */}
            <div className="space-y-1">
              <Label className="text-sm">Aplicar</Label>
              <Button 
                onClick={handleSave} 
                disabled={saving || selectedClinics.length === 0}
                className="w-full h-8 relative bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 transform active:scale-95"
                data-test="apply-button"
                variant="default"
              >
                {saving ? (
                  <div className="flex items-center space-x-2">
                    <svg 
                      className="animate-spin h-3 w-3" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Aplicando...</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="mr-2 h-3 w-3" />
                    <span>Aplicar</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Elemento oculto para almacenar las clínicas seleccionadas */}
        <div data-selected-clinics={JSON.stringify(selectedClinics)} className="hidden"></div>
        
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Tabla de clínicas */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Clínicas</h3>
          </div>
          
          <div className="border rounded-md overflow-hidden" key={tableKey}>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-10 py-2">
                    <div className="flex items-center">
                      <Checkbox 
                        id="select-all-table" 
                        checked={selectedClinics.length === clinics.length && clinics.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todas las clínicas"
                      />
                      <Label htmlFor="select-all-table" className="ml-2 text-xs cursor-pointer">
                        {selectedClinics.length === clinics.length && clinics.length > 0 
                          ? 'Deselec.' 
                          : 'Todas'}
                      </Label>
                    </div>
                  </TableHead>
                  <TableHead className="py-2">Clínica</TableHead>
                  <TableHead className="py-2">Cuota</TableHead>
                  <TableHead className="py-2">Espacio usado</TableHead>
                  <TableHead className="py-2">% de cuota</TableHead>
                  <TableHead className="py-2">% del sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.map((clinic) => {
                  const clinicId = clinic.id.toString();
                  const clinicStats = getClinicStats(clinicId);
                  const clinicQuota = clinicQuotas.find(q => q.entityId === clinicId);
                  const hasCustomQuota = clinicQuota && clinicQuota.id && clinicQuota.id !== 'global';
                  const isSelected = selectedClinics.includes(clinicId);
                  
                  // Calcular porcentajes
                  const quota = hasCustomQuota ? clinicQuota : { 
                    isUnlimited: true, 
                    quotaSize: systemTotal 
                  };
                  
                  const percentUsed = quota.isUnlimited 
                    ? 0 
                    : Math.min(100, (clinicStats.used / quota.quotaSize) * 100);
                    
                  const percentOfSystem = Math.min(100, (clinicStats.used / systemTotal) * 100);
                  
                  // Determinar el color según el porcentaje de uso
                  let statusColor = "bg-green-500";
                  if (percentUsed > 85) statusColor = "bg-red-500";
                  else if (percentUsed > 70) statusColor = "bg-amber-500";
                  
                  return (
                    <TableRow 
                      key={clinicId}
                      data-clinic-id={clinicId}
                      className={isSelected ? "bg-blue-50/70" : percentUsed > 85 ? "bg-red-50/30" : ""}
                    >
                      <TableCell className="py-2">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleClinicSelection(clinicId)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{clinic.name}</span>
                          <span className="text-xs text-gray-500">{clinic.prefix}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {hasCustomQuota ? (
                          clinicQuota?.isUnlimited ? (
                            <Badge variant="outline" className="bg-blue-50 text-xs">Sin límite</Badge>
                          ) : (
                            <span className="text-sm">{formatBytes(clinicQuota?.quotaSize || 0)}</span>
                          )
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-xs">Sin límite (compartido)</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={getUsageColor(clinicId) + " text-sm"}>
                          {formatBytes(clinicStats.used)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center">
                          <div className="w-full max-w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                            <div 
                              className={`${statusColor} h-1.5 rounded-full`} 
                              style={{ width: `${percentUsed}%` }}
                            ></div>
                          </div>
                          <span className="ml-1 text-xs whitespace-nowrap">
                            {quota.isUnlimited ? '∞' : `${percentUsed.toFixed(1)}%`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center">
                          <div className="w-full max-w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full" 
                              style={{ width: `${percentOfSystem}%` }}
                            ></div>
                          </div>
                          <span className="ml-1 text-xs whitespace-nowrap">
                            {`${percentOfSystem.toFixed(1)}%`}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {clinics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      No hay clínicas disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 grid grid-cols-1 md:grid-cols-2 gap-2 border-t pt-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="font-medium">Sin límite</span>: 
                <span>Permite uso del espacio global sin restricciones</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Espacio compartido</span>: 
                <span>Clínicas que comparten el espacio no asignado</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                <span>% de cuota: Porcentaje usado de la cuota asignada</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                <span>% del sistema: Porcentaje usado del total del sistema</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageQuotaSettings; 