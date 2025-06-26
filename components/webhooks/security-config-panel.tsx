"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Shield, 
  Key, 
  Lock, 
  Globe, 
  Plus, 
  Trash2,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"

interface SecurityConfigPanelProps {
  data: {
    hmacSecret?: string
    tokenAuth?: string
    apiKeyHeader?: string
    ipWhitelist?: string[]
  }
  onChange: (data: any) => void
  direction: "incoming" | "outgoing" | "bidirectional"
}

export function SecurityConfigPanel({ data, onChange, direction }: SecurityConfigPanelProps) {
  const [showSecrets, setShowSecrets] = useState(false)
  const [newIp, setNewIp] = useState("")
  const [enableHmac, setEnableHmac] = useState(Boolean(data.hmacSecret))
  const [enableTokenAuth, setEnableTokenAuth] = useState(Boolean(data.tokenAuth))
  const [enableIpWhitelist, setEnableIpWhitelist] = useState(Boolean(data.ipWhitelist?.length))

  const generateSecret = (length: number = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleHmacToggle = (enabled: boolean) => {
    setEnableHmac(enabled)
    if (enabled && !data.hmacSecret) {
      const secret = generateSecret(32)
      onChange({
        ...data,
        hmacSecret: secret
      })
    } else if (!enabled) {
      onChange({
        ...data,
        hmacSecret: ""
      })
    }
  }

  const handleTokenAuthToggle = (enabled: boolean) => {
    setEnableTokenAuth(enabled)
    if (enabled && !data.tokenAuth) {
      const token = `wht_${generateSecret(24)}`
      onChange({
        ...data,
        tokenAuth: token
      })
    } else if (!enabled) {
      onChange({
        ...data,
        tokenAuth: ""
      })
    }
  }

  const handleIpWhitelistToggle = (enabled: boolean) => {
    setEnableIpWhitelist(enabled)
    if (!enabled) {
      onChange({
        ...data,
        ipWhitelist: []
      })
    }
  }

  const addIpToWhitelist = () => {
    if (!newIp.trim()) {
      toast.error("Introduce una IP válida")
      return
    }

    // Validación básica de IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[a-fA-F0-9:]+$/
    if (!ipRegex.test(newIp.trim())) {
      toast.error("Formato de IP inválido")
      return
    }

    const currentList = data.ipWhitelist || []
    if (currentList.includes(newIp.trim())) {
      toast.error("Esta IP ya está en la lista")
      return
    }

    onChange({
      ...data,
      ipWhitelist: [...currentList, newIp.trim()]
    })
    setNewIp("")
    toast.success("IP añadida a la whitelist")
  }

  const removeIpFromWhitelist = (ip: string) => {
    const currentList = data.ipWhitelist || []
    onChange({
      ...data,
      ipWhitelist: currentList.filter(item => item !== ip)
    })
    toast.success("IP eliminada de la whitelist")
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copiado al portapapeles")
  }

  const regenerateSecret = (type: 'hmac' | 'token') => {
    if (type === 'hmac') {
      const secret = generateSecret(32)
      onChange({
        ...data,
        hmacSecret: secret
      })
    } else if (type === 'token') {
      const token = `wht_${generateSecret(24)}`
      onChange({
        ...data,
        tokenAuth: token
      })
    }
    toast.success(`${type === 'hmac' ? 'HMAC Secret' : 'Token'} regenerado`)
  }

  return (
    <div className="space-y-6">
      {/* Autenticación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Autenticación
          </CardTitle>
          <CardDescription>
            Configura los métodos de autenticación para {direction === "incoming" ? "validar requests entrantes" : "autenticar requests salientes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Authentication */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Token de Autenticación</Label>
                <p className="text-sm text-muted-foreground">
                  Token Bearer para autenticar requests
                </p>
              </div>
              <Switch
                checked={enableTokenAuth}
                onCheckedChange={handleTokenAuthToggle}
              />
            </div>

            {enableTokenAuth && (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <div>
                  <Label>Token</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      value={data.tokenAuth || ""}
                      onChange={(e) => onChange({ ...data, tokenAuth: e.target.value })}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecrets(!showSecrets)}
                    >
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(data.tokenAuth || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateSecret('token')}
                    >
                      Regenerar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Header de autenticación</Label>
                  <Input
                    value={data.apiKeyHeader || "Authorization"}
                    onChange={(e) => onChange({ ...data, apiKeyHeader: e.target.value })}
                    placeholder="Authorization"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: {data.apiKeyHeader || "Authorization"}: Bearer {data.tokenAuth ? `${data.tokenAuth.substring(0, 10)}...` : "tu_token"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* HMAC Signature */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Firma HMAC</Label>
                <p className="text-sm text-muted-foreground">
                  Verificación de integridad usando HMAC-SHA256
                </p>
              </div>
              <Switch
                checked={enableHmac}
                onCheckedChange={handleHmacToggle}
              />
            </div>

            {enableHmac && (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <div>
                  <Label>Clave secreta HMAC</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type={showSecrets ? "text" : "password"}
                      value={data.hmacSecret || ""}
                      onChange={(e) => onChange({ ...data, hmacSecret: e.target.value })}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(data.hmacSecret || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateSecret('hmac')}
                    >
                      Regenerar
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Se enviará en el header: <code>X-Webhook-Signature-256</code></p>
                  <p>• Formato: <code>sha256=&lt;hash&gt;</code></p>
                  <p>• Usar para verificar que el payload no ha sido modificado</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Control de acceso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Control de Acceso
          </CardTitle>
          <CardDescription>
            Configura qué IPs pueden acceder a este webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">IP Whitelist</Label>
              <p className="text-sm text-muted-foreground">
                Solo permitir acceso desde IPs específicas
              </p>
            </div>
            <Switch
              checked={enableIpWhitelist}
              onCheckedChange={handleIpWhitelistToggle}
            />
          </div>

          {enableIpWhitelist && (
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg">
              <div>
                <Label>Añadir IP a la whitelist</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    placeholder="192.168.1.100 o 10.0.0.0/24"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addIpToWhitelist()}
                  />
                  <Button onClick={addIpToWhitelist} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Soporta IPs individuales (192.168.1.1) y rangos CIDR (192.168.1.0/24)
                </p>
              </div>

              {data.ipWhitelist && data.ipWhitelist.length > 0 && (
                <div>
                  <Label>IPs permitidas</Label>
                  <div className="space-y-2 mt-2">
                    {data.ipWhitelist.map((ip) => (
                      <div key={ip} className="flex items-center justify-between p-2 bg-background border rounded">
                        <code className="text-sm">{ip}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeIpFromWhitelist(ip)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!data.ipWhitelist || data.ipWhitelist.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay IPs en la whitelist</p>
                  <p className="text-xs">Añade IPs para restringir el acceso</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración por dirección */}
      {direction === "outgoing" || direction === "bidirectional" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Configuración Outgoing
            </CardTitle>
            <CardDescription>
              Configuración de seguridad para webhooks salientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Configuración Outgoing</h3>
              <p className="text-sm">
                Configuración de headers personalizados, timeouts y retry logic para webhooks salientes
              </p>
              <p className="text-xs mt-2 text-orange-600">
                Esta funcionalidad estará disponible próximamente
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resumen de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {enableTokenAuth ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm">
                Token de autenticación: {enableTokenAuth ? "Habilitado" : "Deshabilitado"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {enableHmac ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm">
                Verificación HMAC: {enableHmac ? "Habilitada" : "Deshabilitada"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {enableIpWhitelist && data.ipWhitelist?.length ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm">
                IP Whitelist: {enableIpWhitelist && data.ipWhitelist?.length 
                  ? `${data.ipWhitelist.length} IP(s) configuradas` 
                  : "Deshabilitada (acceso abierto)"
                }
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Recomendaciones de Seguridad</p>
                <ul className="text-blue-700 mt-1 space-y-1">
                  <li>• Habilita siempre la autenticación por token</li>
                  <li>• Usa HMAC para verificar la integridad de los datos</li>
                  <li>• Restringe el acceso con IP whitelist en producción</li>
                  <li>• Regenera tokens y secretos periódicamente</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 