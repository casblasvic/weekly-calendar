import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bluetooth, Loader2 } from "lucide-react"
import { toast } from "sonner"

// UUIDs GATT según documentación oficial Shelly
const UUID_W = "5F6D4F53-5F52-5043-5F74-785F63746C5F"
const UUID_RW = "5F6D4F53-5F52-5043-5F64-6174615F5F5F"

interface Props {
  /** Device ID (o MAC parcial) almacenado en la BD */
  deviceId: string
  /** MAC completa si la tenemos en BD, mejora el filtro */
  macAddress?: string | null
}

/**
 * 🔌 BOTÓN DE PRUEBA RÁPIDA BLE
 * Escanea dispositivos Shelly cercanos y establece la conexión GATT.
 * No envía comandos RPC aún; solo valida el vínculo físico.
 * Pensado para pruebas sin tocar Prisma ni backend.
 */
export function BleConnectButton({ deviceId, macAddress }: Props) {
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const deviceRef = useRef<BluetoothDevice | null>(null)

  // Listener para desconexión externa
  useEffect(() => {
    const handleDisconnected = () => {
      console.info(`[BLE] Dispositivo ${deviceRef.current?.name} desconectado (evento) ❎`)
      setConnected(false)
    }

    const dev = deviceRef.current
    if (dev) {
      dev.addEventListener("gattserverdisconnected", handleDisconnected)
      return () => {
        dev.removeEventListener("gattserverdisconnected", handleDisconnected)
      }
    }
  }, [deviceRef.current])

  const handleConnect = async () => {
    // Si ya está conectado → desconectar
    if (connected && deviceRef.current?.gatt?.connected) {
      console.info(`[BLE] Solicitando desconexión de ${deviceRef.current.name}`)
      deviceRef.current.gatt?.disconnect()
      setConnected(false)
      toast.success("Desconectado del dispositivo BLE")
      return
    }

    if (!(navigator as any).bluetooth) {
      toast.error("Web Bluetooth no soportado en este navegador")
      console.warn("[BLE] Web Bluetooth API no disponible en este navegador")
      return
    }
    setBusy(true)
    console.info("[BLE] Iniciando escaneo…")
    try {
      // Muchos Shelly anuncian nombre "ShellyPlus..." o "SHPLG-S_84FCE6..."
      // Usamos los últimos 6 caracteres del identificador como prefijo, que coincide con el nombre.
      const suffix = (macAddress || deviceId).slice(-6).toUpperCase()

      const device = await (navigator as any).bluetooth.requestDevice({
        // Mostramos todos y luego verificamos si coincide el sufijo.
        acceptAllDevices: true
      })

      if (!(device.name || "").toUpperCase().includes(suffix)) {
        console.warn(`[BLE] Dispositivo seleccionado (${device.name}) no coincide con el sufijo esperado ${suffix}`)
      }

      console.info(`[BLE] Dispositivo seleccionado: ${device.name} (${device.id})`)

      await device.gatt?.connect()
      deviceRef.current = device
      setConnected(true)
      toast.success(`Conectado a ${device.name || device.id}`)
      console.info("[BLE] Conexión GATT establecida ✅")
    } catch (err: any) {
      if (err?.name === "NotFoundError") {
        toast.error("No se seleccionó ningún dispositivo")
        console.warn("[BLE] Escaneo cancelado por el usuario o dispositivo no encontrado")
      } else {
        toast.error(err?.message || "Fallo al conectar BLE")
        console.error("[BLE] Error de conexión:", err)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleConnect}
      disabled={busy}
      className={connected ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"}
      title={connected ? "Desconectar Bluetooth" : "Conectar vía Bluetooth"}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bluetooth className="w-4 h-4" />
      )}
    </Button>
  )
} 