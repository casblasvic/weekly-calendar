"use client";
import React from 'react'
import { useSocketStatus } from '@/app/contexts/socket-status-context'

const colorMap: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-400',
  disconnected: 'bg-rose-500',
  offline: 'bg-rose-500'
}

export const SocketIndicator: React.FC = () => {
  const { status } = useSocketStatus()

  return (
    <div className="relative group mr-2 select-none" aria-label={`Estado tiempo real: ${status}`}>      
      <span className={`inline-block w-2 h-2 rounded-full ${colorMap[status]}`} />
      {/* Tooltip sencillo */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap text-xs text-white bg-neutral-800 rounded px-2 py-1 z-50">
        {status === 'connected' && 'Tiempo real conectado'}
        {status === 'connecting' && 'Conectando…'}
        {(status === 'disconnected' || status === 'offline') && 'Sin conexión'}
      </div>
    </div>
  )
} 