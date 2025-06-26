"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface WebhookHttpFormProps {
    direction: "incoming" | "outgoing" | "bidirectional";
    data: any;
    onChange: (data: any) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const AVAILABLE_EVENTS = [
  { value: "appointment.created", label: "Cita creada" },
  { value: "appointment.updated", label: "Cita actualizada" },
  { value: "client.created", label: "Cliente creado" },
  { value: "payment.received", label: "Pago recibido" },
];

export function WebhookHttpForm({ direction, data, onChange }: WebhookHttpFormProps) {
    const showIncomingSettings = direction === "incoming" || direction === "bidirectional";
    const showOutgoingSettings = direction === "outgoing" || direction === "bidirectional";

    const handleMethodToggle = (method: string) => {
        const currentMethods = data.allowedMethods || [];
        let newMethods: string[];

        if (currentMethods.includes(method)) {
            // Deseleccionar el método
            newMethods = currentMethods.filter((m: string) => m !== method);
        } else {
            // Seleccionar el método
            if (method === 'GET') {
                // Si se selecciona GET, es exclusivo
                newMethods = ['GET'];
                toast.info("El método GET es exclusivo y no se puede combinar con otros.");
            } else {
                // Si se selecciona otro método, quitar GET si estaba y añadir el nuevo
                newMethods = [...currentMethods.filter(m => m !== 'GET'), method];
            }
        }

        if (newMethods.length === 0) {
            toast.error("Debe seleccionar al menos un método HTTP.");
            return;
        }
        onChange({ allowedMethods: newMethods });
    };

    const handleEventToggle = (event: string) => {
        const currentEvents = data.triggerEvents || [];
        const newEvents = currentEvents.includes(event)
            ? currentEvents.filter((e: string) => e !== event)
            : [...currentEvents, event];
        onChange({ triggerEvents: newEvents });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Configuración HTTP</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <div>
                    <Label>Dirección del Webhook</Label>
                    <Select value={direction} onValueChange={(value) => onChange({ direction: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona la dirección" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="incoming">
                                <div className="flex items-center gap-2"><ArrowDown className="w-4 h-4"/><span>Incoming</span></div>
                            </SelectItem>
                            <SelectItem value="outgoing">
                                <div className="flex items-center gap-2"><ArrowUp className="w-4 h-4"/><span>Outgoing</span></div>
                            </SelectItem>
                            <SelectItem value="bidirectional">
                                <div className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4"/><span>Bidirectional</span></div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {showIncomingSettings && (
                    <>
                        <div>
                            <Label>Métodos HTTP Permitidos</Label>
                            <div className="grid grid-cols-4 gap-2 mt-1">
                                {HTTP_METHODS.map((method) => (
                                    <Button
                                        key={method}
                                        variant={(data.allowedMethods || []).includes(method) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleMethodToggle(method)}
                                    >
                                        {method}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-2">
                            <Label htmlFor="rateLimit">Límite de Peticiones (por minuto)</Label>
                            <Input
                                id="rateLimit"
                                type="number"
                                value={data.rateLimitPerMinute || 120}
                                onChange={(e) => onChange({ rateLimitPerMinute: parseInt(e.target.value, 10) || 60 })}
                            />
                        </div>
                    </>
                )}

                {showOutgoingSettings && (
                    <>
                        <div className="pt-2">
                            <Label htmlFor="targetUrl">URL de Destino</Label>
                            <Input
                                id="targetUrl"
                                placeholder="https://api.externa.com/endpoint"
                                value={data.targetUrl || ""}
                                onChange={(e) => onChange({ targetUrl: e.target.value })}
                            />
                        </div>
                        <div className="pt-2">
                            <Label>Eventos de Disparo</Label>
                            <div className="grid grid-cols-2 gap-2 mt-1 border p-3 rounded-md">
                                {AVAILABLE_EVENTS.map((event) => (
                                    <div key={event.value} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`event-${event.value}`}
                                            checked={(data.triggerEvents || []).includes(event.value)}
                                            onCheckedChange={() => handleEventToggle(event.value)}
                                        />
                                        <Label htmlFor={`event-${event.value}`} className="text-sm font-normal">
                                            {event.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
} 