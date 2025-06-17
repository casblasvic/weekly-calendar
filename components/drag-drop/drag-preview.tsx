import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DragPreview as DragPreviewType } from '@/lib/drag-drop/types';
import { formatDateForDisplay } from '@/lib/drag-drop/utils';

interface DragPreviewProps {
  preview: DragPreviewType;
  duration: number; // in minutes
  color: string;
  title: string;
}

export const DragPreview: React.FC<DragPreviewProps> = ({
  preview,
  duration,
  color,
  title
}) => {
  const minuteHeight = 1; // 1px per minute for consistency
  const height = duration * minuteHeight;
  
  return (
    <div
      className="fixed pointer-events-none z-50 transition-all duration-75"
      style={{
        left: preview.x + 10,
        top: preview.y - 20,
        transform: 'translate(0, -50%)'
      }}
    >
      {/* Preview card */}
      <div
        className="rounded-lg shadow-2xl border-2 border-white opacity-90"
        style={{
          backgroundColor: color,
          minHeight: `${height}px`,
          width: '200px'
        }}
      >
        <div className="p-2 text-white">
          <div className="font-semibold text-sm">{title}</div>
          <div className="text-xs mt-1 space-y-1">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDateForDisplay(preview.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-bold">{preview.time}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tooltip arrow */}
      <div 
        className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-0 h-0"
        style={{
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: `8px solid ${color}`
        }}
      />
    </div>
  );
};
