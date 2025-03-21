import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { HardDrive, Save } from 'lucide-react';

interface StorageQuotaSettingsProps {
  quotaSize: number;
  isUnlimited: boolean;
  onSave: (size: number, isUnlimited: boolean) => void;
}

const StorageQuotaSettings: React.FC<StorageQuotaSettingsProps> = ({
  quotaSize,
  isUnlimited,
  onSave
}) => {
  const [sizeValue, setSizeValue] = useState(quotaSize / (1024 * 1024 * 1024)); // Convertir a GB
  const [sizeUnit, setSizeUnit] = useState('GB');
  const [unlimited, setUnlimited] = useState(isUnlimited);
  const [saving, setSaving] = useState(false);
  
  const handleSave = () => {
    setSaving(true);
    
    try {
      // Convertir a bytes según la unidad seleccionada
      let sizeInBytes = sizeValue;
      if (sizeUnit === 'GB') {
        sizeInBytes = sizeValue * 1024 * 1024 * 1024;
      } else if (sizeUnit === 'MB') {
        sizeInBytes = sizeValue * 1024 * 1024;
      }
      
      onSave(sizeInBytes, unlimited);
      toast.success('Configuración de cuota actualizada correctamente');
    } catch (error) {
      toast.error('Error al guardar la configuración de cuota');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Configuración de cuota
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="unlimited-toggle" className="text-sm">Sin límite de almacenamiento</Label>
            <Switch 
              id="unlimited-toggle" 
              checked={unlimited}
              onCheckedChange={setUnlimited}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quota-size" className="text-sm">Tamaño de cuota</Label>
            <div className="flex gap-2">
              <Input 
                id="quota-size"
                type="number"
                min="1"
                value={sizeValue}
                onChange={(e) => setSizeValue(parseFloat(e.target.value))}
                disabled={unlimited}
              />
              <Select 
                value={sizeUnit} 
                onValueChange={setSizeUnit}
                disabled={unlimited}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GB">GB</SelectItem>
                  <SelectItem value="MB">MB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white rounded-full animate-spin border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar configuración
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageQuotaSettings; 