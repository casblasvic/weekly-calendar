import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FileText, Image, Film, Archive, File } from 'lucide-react';

interface StorageTypeData {
  type: string;
  size: number;
  color: string;
}

interface StorageTypeChartProps {
  data: Record<string, number>; // Datos en formato {image: 1000000, application: 500000, ...}
}

// Función para formatear bytes en forma legible
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Mapa de colores por tipo
const TYPE_COLORS: Record<string, string> = {
  image: '#3b82f6', // blue
  video: '#ef4444', // red
  audio: '#10b981', // green
  application: '#f97316', // orange
  text: '#8b5cf6', // purple
  default: '#6b7280', // gray
};

// Mapa de iconos por tipo
const TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  audio: <File className="h-4 w-4" />,
  application: <FileText className="h-4 w-4" />,
  text: <FileText className="h-4 w-4" />,
  default: <Archive className="h-4 w-4" />,
};

// Mapa de nombres legibles por tipo
const TYPE_NAMES: Record<string, string> = {
  image: 'Imágenes',
  video: 'Vídeos',
  audio: 'Audio',
  application: 'Documentos',
  text: 'Textos',
  default: 'Otros',
};

const StorageTypeChart: React.FC<StorageTypeChartProps> = ({ data }) => {
  // Preparar datos para el gráfico
  const chartData: StorageTypeData[] = Object.entries(data).map(([type, size]) => ({
    type,
    size,
    color: TYPE_COLORS[type] || TYPE_COLORS.default,
  })).sort((a, b) => b.size - a.size);
  
  // Si no hay datos, mostrar mensaje
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tipos de archivo</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500 text-sm">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de archivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="size"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatBytes(value)}
                labelFormatter={(label) => TYPE_NAMES[label] || label}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.map((entry) => (
            <div key={entry.type} className="flex items-center gap-2">
              <div 
                className="h-3 w-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-1">{TYPE_ICONS[entry.type] || TYPE_ICONS.default}</span>
                <span>{TYPE_NAMES[entry.type] || entry.type}</span>
              </div>
              <span className="text-xs text-gray-500 ml-auto">{formatBytes(entry.size)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageTypeChart; 