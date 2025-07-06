import React, { createContext, useContext, useState } from 'react'

/**
 * SocketStatusContext  
 * --------------------------------------------------
 * Contexto global para monitorizar el estado del WebSocket de tiempo real
 * ('connected' | 'connecting' | 'disconnected' | 'offline').  
 * El valor se actualiza desde los hooks `useSocket` y `use-appointment-timer`.  
 * Otros componentes pueden consumirlo para mostrar UI reactiva (p.e. indicador de estado).  
 * --------------------------------------------------
 */

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'offline'

interface SocketStatusContextValue {
  status: SocketStatus
  setStatus: (s: SocketStatus) => void
}

const SocketStatusContext = createContext<SocketStatusContextValue | undefined>(undefined)

export const SocketStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SocketStatus>('connecting')

  return (
    <SocketStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </SocketStatusContext.Provider>
  )
}

export const useSocketStatus = (): SocketStatusContextValue => {
  const ctx = useContext(SocketStatusContext)
  if (!ctx) throw new Error('useSocketStatus debe usarse dentro de SocketStatusProvider')
  return ctx
} 