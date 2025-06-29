import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Check, X, Loader2, RefreshCw, Wifi } from 'lucide-react';

interface ConfigControlProps {
  deviceId: string;
  disabled?: boolean;
}

// Hook personalizado para manejar actualizaciones de configuración
export const useConfigUpdate = (deviceId: string) => {
  const { toast } = useToast();

  const updateConfig = async (endpoint: string, params: any) => {
    try {
      const response = await fetch(`/api/shelly/device/${deviceId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, params })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar configuración');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error en configuración:', error);
      throw error;
    }
  };

  return { updateConfig, toast };
};

// Componente Switch que se ejecuta inmediatamente
interface ConfigSwitchProps extends ConfigControlProps {
  label: string;
  description?: string;
  value: boolean;
  endpoint: string;
  paramKey: string;
  onSuccess?: () => void;
}

export const ConfigSwitch: React.FC<ConfigSwitchProps> = ({
  deviceId,
  label,
  description,
  value,
  endpoint,
  paramKey,
  onSuccess,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const { updateConfig, toast } = useConfigUpdate(deviceId);

  const handleChange = async (newValue: boolean) => {
    setLoading(true);
    setCurrentValue(newValue); // Optimistic update

    try {
      await updateConfig(endpoint, { [paramKey]: newValue });
      
      toast({
        title: "Configuración actualizada",
        description: `${label} ${newValue ? 'activado' : 'desactivado'} correctamente`,
      });
      
      onSuccess?.();
    } catch (error) {
      // Revertir cambio optimista
      setCurrentValue(!newValue);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <Label className="font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        <Switch
          checked={currentValue}
          onCheckedChange={handleChange}
          disabled={disabled || loading}
        />
      </div>
    </div>
  );
};

// Componente Input con confirmación
interface ConfigInputProps extends ConfigControlProps {
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  endpoint: string;
  paramKey: string;
  onSuccess?: () => void;
}

export const ConfigInput: React.FC<ConfigInputProps> = ({
  deviceId,
  label,
  description,
  value,
  placeholder,
  endpoint,
  paramKey,
  onSuccess,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [hasChanged, setHasChanged] = useState(false);
  const { updateConfig, toast } = useConfigUpdate(deviceId);

  const handleInputChange = (newValue: string) => {
    setCurrentValue(newValue);
    setHasChanged(newValue !== value);
  };

  const handleConfirm = async () => {
    setLoading(true);

    try {
      await updateConfig(endpoint, { [paramKey]: currentValue });
      
      toast({
        title: "Configuración actualizada",
        description: `${label} actualizado correctamente`,
      });
      
      setHasChanged(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setHasChanged(false);
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Input
          value={currentValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || loading}
          className="flex-1"
        />
        {hasChanged && (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
              className="px-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Dropdown con confirmación
interface ConfigSelectProps extends ConfigControlProps {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  endpoint: string;
  paramKey: string;
  onSuccess?: () => void;
}

export const ConfigSelect: React.FC<ConfigSelectProps> = ({
  deviceId,
  label,
  description,
  value,
  options,
  endpoint,
  paramKey,
  onSuccess,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [hasChanged, setHasChanged] = useState(false);
  const { updateConfig, toast } = useConfigUpdate(deviceId);

  const handleSelectChange = (newValue: string) => {
    setCurrentValue(newValue);
    setHasChanged(newValue !== value);
  };

  const handleConfirm = async () => {
    setLoading(true);

    try {
      await updateConfig(endpoint, { [paramKey]: currentValue });
      
      toast({
        title: "Configuración actualizada",
        description: `${label} actualizado correctamente`,
      });
      
      setHasChanged(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setHasChanged(false);
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex gap-2">
        <Select
          value={currentValue}
          onValueChange={handleSelectChange}
          disabled={disabled || loading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasChanged && (
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
              className="px-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente Button de acción directa
interface ConfigButtonProps extends ConfigControlProps {
  label: string;
  description?: string;
  buttonText: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
  endpoint?: string;
  action?: () => Promise<void>;
  onSuccess?: () => void;
}

export const ConfigButton: React.FC<ConfigButtonProps> = ({
  deviceId,
  label,
  description,
  buttonText,
  variant = "default",
  endpoint,
  action,
  onSuccess,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const { updateConfig, toast } = useConfigUpdate(deviceId);

  const handleClick = async () => {
    setLoading(true);

    try {
      if (action) {
        await action();
      } else if (endpoint) {
        await updateConfig(endpoint, {});
      }
      
      toast({
        title: "Acción completada",
        description: `${label} ejecutado correctamente`,
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al ejecutar la acción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-1">
        <Label className="font-medium">{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        variant={variant}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : null}
        {buttonText}
      </Button>
    </div>
  );
};

// Componente WiFi Scanner
interface WiFiNetwork {
  ssid: string;
  rssi: number;
  security: string;
  channel: number;
}

interface WiFiScannerProps extends ConfigControlProps {
  onNetworkSelect: (ssid: string) => void;
}

export const WiFiScanner: React.FC<WiFiScannerProps> = ({
  deviceId,
  onNetworkSelect,
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const { toast } = useToast();

  const scanNetworks = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/shelly/device/${deviceId}/wifi-scan`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error al escanear redes WiFi');
      }

      const result = await response.json();
      setNetworks(result.networks || []);
      
      toast({
        title: "Escaneo completado",
        description: `Se encontraron ${result.networks?.length || 0} redes WiFi`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo escanear las redes WiFi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return { bars: 4, color: 'text-green-600' };
    if (rssi > -60) return { bars: 3, color: 'text-yellow-600' };
    if (rssi > -70) return { bars: 2, color: 'text-orange-600' };
    return { bars: 1, color: 'text-red-600' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="font-medium">Redes WiFi disponibles</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={scanNetworks}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Escanear
        </Button>
      </div>

      {networks.length > 0 && (
        <div className="max-h-40 overflow-y-auto border rounded-lg">
          {networks.map((network, index) => {
            const signal = getSignalStrength(network.rssi);
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => onNetworkSelect(network.ssid)}
              >
                <div className="flex items-center gap-3">
                  <Wifi className={`w-4 h-4 ${signal.color}`} />
                  <div>
                    <div className="font-medium">{network.ssid}</div>
                    <div className="text-xs text-muted-foreground">
                      Canal {network.channel} • {network.security}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {network.rssi} dBm
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}; 