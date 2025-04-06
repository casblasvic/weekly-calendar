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
import { useStorage } from '@/contexts/storage-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useClinic } from '@/contexts/clinic-context';

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
  const { getStorageStats, getQuota, setQuota, getClinicQuotas } = useStorage();
  const clinicContext = useClinic();
  
  // Estados para configuración de cuota
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [sizeValue, setSizeValue] = useState('1');
  const [sizeUnit, setSizeUnit] = useState('GB');
  const [customMode, setCustomMode] = useState(false);
  const [configuringClinic, setConfiguringClinic] = useState<string | null>(null);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
  const [proportionalDistribution, setProportionalDistribution] = useState(false);
  
  // Estado para total del sistema
  const systemTotal = propSystemTotal || DEFAULT_SYSTEM_TOTAL;
  
  // Estado para lista de clínicas
  const [clinics, setClinics] = useState<any[]>([]);
  
  // Estadísticas de uso
  const [usageStats, setUsageStats] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  
  // Función para refrescar estadísticas
  const refreshStorageStats = useCallback(() => {
    setRefreshing(true);
    try {
      // Obtener estadísticas actualizadas
      const stats: Record<string, any> = {};
      
      // Obtener estadísticas globales
      const globalStats = getStorageStats('global');
      stats['global'] = {
        ...globalStats,
        quota: getQuota('global'),
      };
      
      // Obtener estadísticas por clínica
      clinics.forEach(clinic => {
        const clinicId = clinic.id.toString();
        const clinicStats = getStorageStats(clinicId);
        const clinicQuota = getQuota(clinicId);
        
        stats[clinicId] = {
          ...clinicStats,
          quota: clinicQuota,
        };
      });
      
      setUsageStats(stats);
    } catch (error) {
      console.error('Error al refrescar estadísticas:', error);
    } finally {
      setRefreshing(false);
    }
  }, [clinics, getStorageStats, getQuota]);
  
  // Cargar clínicas y estadísticas
  useEffect(() => {
    const loadClinicData = async () => {
      setLoadingClinics(true);
      try {
        // Obtener clínicas usando el nombre correcto de la función
        const clinicsList = await clinicContext.getAllClinicas();
        
        // Formatear los datos para mantener compatibilidad
        const formattedClinics = clinicsList.map(clinic => ({
          id: clinic.id.toString(),
          name: clinic.name,
          city: clinic.city || '',
          active: true
        }));
        
        setClinics(formattedClinics);
        
        // Inicializar selección
        setSelectedClinics([]);
        
        // Cargar estadísticas INICIALES
        refreshStorageStats();
      } catch (error) {
        console.error('Error al cargar clínicas:', error);
        toast.error('Error al cargar información de clínicas');
      } finally {
        setLoadingClinics(false);
      }
    };
    
    loadClinicData();
  }, [clinicContext.getAllClinicas, refreshStorageStats]);
  
  // Estado para almacenar los datos
  const [clinicQuotas, setClinicQuotas] = useState(usageStats);
  const [totalAssigned, setTotalAssigned] = useState(0);
  
  // Estados para el formulario
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Función para refrescar la lista de clínicas
  const refreshClinics = useCallback(() => {
    try {
      const freshClinics = clinics;
      console.log("Refrescando lista de clínicas:", freshClinics);
      setClinics(freshClinics);
    } catch (error) {
      console.error("Error al refrescar lista de clínicas:", error);
    }
  }, [clinics]);
  
  // Cargar clínicas al montar el componente
  useEffect(() => {
    refreshClinics();
  }, [refreshClinics]);
  
  // Validar que la cuota no exceda el límite del sistema
  useEffect(() => {
    if (!isUnlimited) {
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
  }, [sizeValue, sizeUnit, isUnlimited, totalAssigned, selectedClinics, clinicQuotas, systemTotal]);
  
  // Cache de estadísticas para evitar recálculos repetidos
  const statsCache = useMemo(() => {
    const cache: Record<string, any> = {};
    
    // Pre-calcular estadísticas para todas las clínicas
    clinics.forEach(clinic => {
      try {
        const clinicId = clinic.id.toString();
        const stats = getStorageStats(clinicId);
        cache[clinicId] = stats;
      } catch (error) {
        console.error(`Error calculating stats for clinic ${clinic.id}:`, error);
      }
    });
    
    return cache;
  }, [clinics, getStorageStats]);
  
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
            setSizeValue((clinicQuota.quotaSize / BYTES_IN_GB).toString());
          } else if (sizeUnit === 'MB') {
            setSizeValue((clinicQuota.quotaSize / BYTES_IN_MB).toString());
          }
          setIsUnlimited(clinicQuota.isUnlimited);
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
  
  const handleSave = async () => {
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
    
    console.log(`Aplicando configuración: ${numericValue} ${sizeUnit} = ${formatBytes(sizeInBytes)}, Sin límite: ${isUnlimited}`);
    console.log(`Clínicas seleccionadas (${selectedClinics.length}): ${selectedClinics.join(', ')}`);
    
    try {
      // Llamar directamente al método onSave para notificar al componente padre
      // Esto es lo más importante para asegurar que el cambio se propague
      if (onSave) {
        console.log("Llamando a onSave del componente padre");
        onSave(sizeInBytes, isUnlimited);
      }
      
      // Aplicar también los cambios a nivel local
      let success = true;
      
      // Aplicar los cambios para cada clínica seleccionada
      for (const clinicId of selectedClinics) {
        try {
          // Manejar tanto si setQuota devuelve una promesa como si devuelve un valor directo
          const result = await Promise.resolve(setQuota('clinic', clinicId, sizeInBytes, isUnlimited));
          if (!result) {
            success = false;
            console.error(`Error al aplicar cuota a clínica ${clinicId}`);
          }
        } catch (error) {
          success = false;
          console.error(`Error al aplicar cuota a clínica ${clinicId}:`, error);
        }
      }
      
      // Actualizar la interfaz con los resultados
      if (success) {
        // Obtener los datos actualizados
        refreshClinics();
        
        try {
          // Obtener cuotas actualizadas y esperar a que se resuelva la promesa
          const updatedQuotas = await getClinicQuotas();
          // Asegurar que es un array
          const quotasArray = Array.isArray(updatedQuotas) ? updatedQuotas : await Promise.resolve(updatedQuotas);
          
          setClinicQuotas(quotasArray);
          
          // Recalcular total asignado
          let assignedTotal = 0;
          
          // Ahora podemos iterar sobre el array
          quotasArray.forEach(quota => {
            if (!quota.isUnlimited) {
              assignedTotal += quota.quotaSize;
            }
          });
          
          setTotalAssigned(assignedTotal);
          
          toast.success(`Configuración aplicada a ${selectedClinics.length} clínica(s)`);
        } catch (error) {
          console.error("Error al procesar cuotas:", error);
          toast.error('Error al actualizar información de cuotas');
        }
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
    const updateQuotaData = async () => {
      try {
        // Obtener cuotas y esperar a que se resuelva la promesa
        const updatedQuotas = await getClinicQuotas();
        // Asegurar que es un array
        const quotasArray = Array.isArray(updatedQuotas) ? updatedQuotas : await Promise.resolve(updatedQuotas);
        
        let assignedTotal = 0;
        
        // Ahora podemos iterar sobre el array
        quotasArray.forEach(quota => {
          if (!quota.isUnlimited) {
            assignedTotal += quota.quotaSize;
          }
        });
        
        setClinicQuotas(quotasArray);
        setTotalAssigned(assignedTotal);
      } catch (error) {
        console.error("Error actualizando datos:", error);
      }
    };
    
    updateQuotaData();
  }, [getClinicQuotas]);
  
  // Function to distribute storage equally
  const distributeStorageEqually = async () => {
    // Implementar lógica para distribuir almacenamiento equitativamente
    if (selectedClinics.length === 0) {
      toast.warning('No hay clínicas seleccionadas para distribuir cuotas');
      return;
    }
    
    const numClinics = selectedClinics.length;
    const equalShare = systemTotal / numClinics;
    
    // Aplicar la misma cuota a todas las clínicas seleccionadas
    try {
      for (const clinicId of selectedClinics) {
        await setQuota('clinic', clinicId, equalShare, false);
      }
      
      toast.success(`Cuota distribuida equitativamente entre ${numClinics} clínicas`);
      refreshStorageStats();
    } catch (error) {
      console.error('Error al distribuir almacenamiento:', error);
      toast.error('No se pudo distribuir el almacenamiento');
    }
  };
  
  return (
    <Card className="shadow-sm" data-component="storage-quota-settings">
      {showTotalInfo && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="w-4 h-4" />
            Espacio total disponible: {formatBytes(systemTotal)}
          </CardTitle>
          <CardDescription className="text-xs">
            Espacio asignado a clínicas: {formatBytes(totalAssigned)} | 
            Disponible para asignar: {formatBytes(Math.max(0, systemTotal - totalAssigned))}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="pt-3 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                  disabled={isUnlimited}
                  className="h-8"
                  data-test="quota-size-input"
                />
                <Select 
                  value={sizeUnit} 
                  onValueChange={setSizeUnit}
                  disabled={isUnlimited}
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
                  checked={isUnlimited}
                  onCheckedChange={setIsUnlimited}
                  data-test="unlimited-toggle"
                />
                <span className="ml-2 text-xs text-gray-600">
                  {isUnlimited ? 'Sí' : 'No'}
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
                className="relative w-full h-8 text-white transition-all duration-200 transform bg-blue-600 hover:bg-blue-700 active:scale-95"
                data-test="apply-button"
                variant="default"
              >
                {saving ? (
                  <div className="flex items-center space-x-2">
                    <svg 
                      className="w-3 h-3 animate-spin" 
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
                    <Save className="w-3 h-3 mr-2" />
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
            <AlertCircle className="w-4 h-4" />
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
          
          <div className="overflow-hidden border rounded-md" key={tableKey}>
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
                            <Badge variant="outline" className="text-xs bg-blue-50">Sin límite</Badge>
                          ) : (
                            <span className="text-sm">{formatBytes(clinicQuota?.quotaSize || 0)}</span>
                          )
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-50">Sin límite (compartido)</Badge>
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
                    <TableCell colSpan={6} className="py-4 text-center text-gray-500">
                      No hay clínicas disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="grid grid-cols-1 gap-2 pt-3 mt-3 text-xs text-gray-500 border-t md:grid-cols-2">
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
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>% de cuota: Porcentaje usado de la cuota asignada</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
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