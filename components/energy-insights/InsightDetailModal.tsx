"use client"

/**
 * InsightDetailModal
 * ---------------------------------------------------
 * Muestra información detallada de un DeviceUsageInsight y permite al
 * usuario marcarlo como resuelto.  El componente se mantiene aislado de
 * la lógica de listado para facilitar su reutilización desde otros
 * contextos (ej. alertas en agenda o dashboard).
 *
 * Props
 * -----
 * insight:   Objeto DeviceUsageInsight reducido (ver interfaz Insight)
 * onClose(): callback para cerrar
 * onResolved(updatedInsight): callback al marcar como resuelto
 *
 * Precauciones / convenciones
 * --------------------------
 * • Las llamadas fetch usan el endpoint PATCH /api/internal/energy-insights
 *   esperando { id, resolved }.
 * • No se hace revalidación SWR aquí; el padre deberá refrescar.
 * • El feature-flag SHELLY debe estar activo; si se renderiza sin flag
 *   devolvemos null para no romper SSR.
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export interface InsightModalData {
  id: string
  appointmentId: string
  detectedAt: string
  deviationPct: number
  actualKwh: number
  expectedKwh: number
  insightType: string
  resolved: boolean
  detailJson?: any
}

interface Props {
  insight: InsightModalData | null
  onClose: () => void
  onResolved: (insight: InsightModalData) => void
}

export default function InsightDetailModal ({ insight, onClose, onResolved }: Props) {
  const [loading, setLoading] = useState(false)
  if (!insight) return null
  if (!process.env.NEXT_PUBLIC_FEATURE_SHELLY) return null

  const chartData = [
    { name: 'Previsto', kwh: insight.expectedKwh },
    { name: 'Real', kwh: insight.actualKwh }
  ]

  const handleResolve = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/internal/energy-insights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: insight.id, resolved: true })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success('Insight marcado como revisado')
      onResolved(data.insight)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!insight} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Análisis energía
            <Badge variant="destructive">+{insight.deviationPct.toFixed(1)}%</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip formatter={(val:number)=>val.toFixed(2)+' kWh'} />
              <Line type="monotone" dataKey="kwh" stroke="#ff6961" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-sm text-gray-600 space-y-1 mt-2">
          <p><strong>Cita:</strong> {insight.appointmentId}</p>
          <p><strong>Detectado:</strong> {new Date(insight.detectedAt).toLocaleString()}</p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          {!insight.resolved && (
            <Button disabled={loading} onClick={handleResolve}>Marcar revisado</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 