import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Database } from 'lucide-react';

interface StorageStatusCardProps {
  used: number;
  total: number;
  isUnlimited: boolean;
  title?: string;
  description?: string;
  showDetails?: boolean;
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
  isUnlimited,
  title = 'Uso de almacenamiento',
  description,
  showDetails = false
}) => {
  const percentUsed = isUnlimited ? 0 : Math.min(100, (used / total) * 100);
  const percentText = percentUsed.toFixed(1) + '%';
  
  // Determinar el color según el porcentaje de uso
  let statusColor = 'bg-green-500';
  let statusText = 'Normal';
  
  if (percentUsed > 85) {
    statusColor = 'bg-red-500';
    statusText = 'Crítico';
  } else if (percentUsed > 70) {
    statusColor = 'bg-yellow-500';
    statusText = 'Atención';
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-md">
          <Database className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {isUnlimited ? 'Sin límite' : percentText}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isUnlimited ? 'bg-blue-500' : statusColor}`}></div>
              <span className="text-sm text-gray-500">
                {isUnlimited ? 'Ilimitado' : statusText}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-200 rounded-full h-2.5">
            <div 
              className={`${isUnlimited ? 'bg-blue-500' : statusColor} h-2.5 rounded-full`} 
              style={{ width: `${isUnlimited ? 15 : percentUsed}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Usado</span>
            <span className="text-sm text-gray-500">
              {isUnlimited ? 'Ilimitado' : 'Total'}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">{formatBytes(used)}</span>
            <span className="text-sm font-medium">
              {isUnlimited ? '∞' : formatBytes(total)}
            </span>
          </div>
          
          {showDetails && (
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span>Espacio libre:</span>
                <span>{isUnlimited ? '∞' : formatBytes(Math.max(0, total - used))}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Porcentaje libre:</span>
                <span>{isUnlimited ? '100%' : (100 - percentUsed).toFixed(1) + '%'}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageStatusCard; 