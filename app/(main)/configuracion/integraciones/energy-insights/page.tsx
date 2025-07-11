"use client"

/**
 * Energy Insights Page
 * ----------------------------------------------------
 * Esta vista permite a un usuario con el módulo Shelly activo
 * consultar las desviaciones energéticas detectadas en tiempo real
 * (DeviceUsageInsight).  La lógica heavy-lift ya reside en el backend
 * y los endpoints internos:  
 *   • GET  /api/internal/energy-insights        → listado con filtros  
 *   • POST /api/internal/energy-insights/recalc → recalcular perfiles  
 *   • PATCH /api/internal/energy-insights/{id}  → marcar como revisado
 * 
 * Variables importantes que otros desarrolladores / modelos IA deben
 * conocer:  
 *   expectedKwh   – energía prevista  (perfil histórico)  
 *   actualKwh     – energía registrada (sensor)  
 *   deviationPct  – % de diferencia (positivo = sobre-consumo)  
 * 
 * Precauciones:  
 * • Este componente está cubierto por feature-flag SHELLY; si el flag
 *   está desactivado, la ruta existe pero mostrará un mensaje de módulo
 *   inactivo (sin hacer llamadas).  
 * • Las llamadas fetch usan la sesión NextAuth; no exponer datos
 *   sensibles si el usuario no está autenticado.  
 * • Para escalabilidad se trae máx. 200 filas; para más registros usar
 *   paginación server-side en futuras versiones.
 */

import { useEffect, useState, useCallback } from 'react'
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CardDescription } from '@/components/ui/card'
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Zap } from 'lucide-react'
import { toast } from 'sonner'

interface Insight {
  id: string
  appointmentId: string
  detectedAt: string
  deviationPct: number
  actualKwh: number
  expectedKwh: number
  resolved: boolean
}

export default function EnergyInsightsPage () {
  const [insights, setInsights] = useState<Insight[]>([])
  const [filters, setFilters] = useState<{ clinicId?: string; clientId?: string; userId?: string; serviceId?: string; groupHash?: string }>({})
  const { isShellyActive } = useIntegrationModules()
  const [loading, setLoading] = useState(false)
  const [recalcLoading, setRecalcLoading] = useState(false)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ status: 'open', ...filters }).toString()
      const res = await fetch(`/api/internal/energy-insights?${qs}`)
      if (!res.ok) throw new Error('Error cargando insights')
      const data = await res.json()
      setInsights(data.insights)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const handleRecalc = useCallback(async () => {
    setRecalcLoading(true)
    try {
      const res = await fetch('/api/internal/energy-insights/recalc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error recalculando')
      toast.success(`Perfiles: ${data.profiles} · Nuevos insights: ${data.insightsCreated}`)
      fetchInsights()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setRecalcLoading(false)
    }
  }, [fetchInsights])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  // KPI helpers
  const avgDeviation = insights.length ? insights.reduce((a,b)=>a+b.deviationPct,0)/insights.length : 0

  if (!isShellyActive) {
    return (
      <Card className="max-w-xl mx-auto mt-10">
        <CardHeader>
          <CardTitle>Gestión energía</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">El módulo de enchufes inteligentes no está activo.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold flex gap-2 items-center"><Zap className="w-5 h-5 text-yellow-500"/>Gestión energía</h1>
        <Button size="sm" onClick={handleRecalc} disabled={recalcLoading}>
          Recalcular perfiles
        </Button>
      </div>

      {/* Barra filtros */}
      <Card className="p-4 mt-2">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <CardDescription>Clínica</CardDescription>
            <Input placeholder="clinicId" value={filters.clinicId||''} onChange={e=>setFilters(f=>({...f,clinicId:e.target.value||undefined}))}/>
          </div>
          <div className="space-y-1">
            <CardDescription>Cliente</CardDescription>
            <Input placeholder="personId" value={filters.clientId||''} onChange={e=>setFilters(f=>({...f,clientId:e.target.value||undefined}))}/>
          </div>
          <div className="space-y-1">
            <CardDescription>Empleado</CardDescription>
            <Input placeholder="userId" value={filters.userId||''} onChange={e=>setFilters(f=>({...f,userId:e.target.value||undefined}))}/>
          </div>
          <div className="space-y-1">
            <CardDescription>Servicio</CardDescription>
            <Input placeholder="serviceId" value={filters.serviceId||''} onChange={e=>setFilters(f=>({...f,serviceId:e.target.value||undefined}))}/>
          </div>
          <div className="space-y-1">
            <CardDescription>Grupo hash</CardDescription>
            <Input placeholder="hash" value={filters.groupHash||''} onChange={e=>setFilters(f=>({...f,groupHash:e.target.value||undefined}))}/>
          </div>
          <Button variant="secondary" onClick={()=>fetchInsights()}>Aplicar</Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4"><CardTitle>Total anomalías</CardTitle><p className="text-3xl font-bold mt-2">{insights.length}</p></Card>
        <Card className="p-4"><CardTitle>Desviación media</CardTitle><p className="text-3xl font-bold mt-2">{avgDeviation.toFixed(1)}%</p></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights abiertos ({insights.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cita</TableHead>
                <TableHead className="text-right">kWh (real / esperado)</TableHead>
                <TableHead>Desviación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.map(ins => (
                <TableRow key={ins.id}>
                  <TableCell>{new Date(ins.detectedAt).toLocaleString()}</TableCell>
                  <TableCell>{ins.appointmentId.slice(0,8)}…</TableCell>
                  <TableCell className="text-right">{ins.actualKwh.toFixed(2)} / {ins.expectedKwh.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">+{ins.deviationPct.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {insights.length === 0 && !loading && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-gray-500">Sin registros</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 