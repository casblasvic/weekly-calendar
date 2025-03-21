import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, HardDrive } from 'lucide-react';

interface StorageStatusCardProps {
  used: number;
  total: number;
  isUnlimited?: boolean;
}

// Función para formatear bytes en forma legible
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StorageStatusCard: React.FC<StorageStatusCardProps> = ({
  used,
  total,
  isUnlimited = false
}) => {
  // Calcular porcentaje utilizado
  const percentUsed = isUnlimited ? 0 : Math.min(100, (used / total) * 100);
  
  // Determinar color basado en uso
  let statusColor = 'bg-green-500';
  if (percentUsed > 90) {
    statusColor = 'bg-red-500';
  } else if (percentUsed > 70) {
    statusColor = 'bg-yellow-500';
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          <span>Almacenamiento</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Espacio utilizado</span>
            <span className="font-medium">{formatBytes(used)}</span>
          </div>
          
          <Progress 
            value={percentUsed} 
            className="h-2" 
            indicatorClassName={statusColor}
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className={percentUsed > 90 ? "text-red-500 font-medium" : "text-gray-500"}>
              {isUnlimited ? "Sin límite" : `${formatBytes(used)} de ${formatBytes(total)}`}
            </span>
            <span className="text-gray-500">
              {isUnlimited ? "∞" : `${percentUsed.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageStatusCard; 