"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw, Shield } from "lucide-react"

interface WebhookSecurityFormProps {
    data: {
        authType: "none" | "bearer" | "hmac" | "api_key";
        tokenAuth?: string;
        hmacSecret?: string;
        apiKeyHeader?: string;
    };
    onChange: (data: any) => void;
}

export function WebhookSecurityForm({ data, onChange }: WebhookSecurityFormProps) {
    
    const handleAuthTypeChange = (type: "none" | "bearer" | "hmac" | "api_key") => {
        onChange({ authType: type });
    };

    const handleValueChange = (field: string, value: string) => {
        onChange({ [field]: value });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex gap-2 items-center text-base">
                    <Shield className="w-4 h-4" />
                    Seguridad del Webhook
                </CardTitle>
                <CardDescription>
                    Configura la autenticación que se aplicará automáticamente.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                    <Label>Tipo de Autenticación</Label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        <Button
                            variant={data.authType === "none" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAuthTypeChange("none")}
                            className="px-3 py-2 h-auto"
                        >
                            <div className="text-center"><div className="text-xs font-medium">Ninguna</div><div className="text-xs text-muted-foreground">Público</div></div>
                        </Button>
                        <Button
                            variant={data.authType === "bearer" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAuthTypeChange("bearer")}
                            className="px-3 py-2 h-auto"
                        >
                            <div className="text-center"><div className="text-xs font-medium">Bearer</div><div className="text-xs text-muted-foreground">Token</div></div>
                        </Button>
                        <Button
                            variant={data.authType === "hmac" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAuthTypeChange("hmac")}
                            className="px-3 py-2 h-auto"
                        >
                            <div className="text-center"><div className="text-xs font-medium">HMAC</div><div className="text-xs text-muted-foreground">Seguro</div></div>
                        </Button>
                        <Button
                            variant={data.authType === "api_key" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleAuthTypeChange("api_key")}
                            className="px-3 py-2 h-auto"
                        >
                            <div className="text-center"><div className="text-xs font-medium">API Key</div><div className="text-xs text-muted-foreground">Simple</div></div>
                        </Button>
                    </div>
                </div>

                {data.authType === "bearer" && (
                    <div className="space-y-2">
                        <Label>Bearer Token</Label>
                        <div className="flex gap-2">
                            <Input
                                value={data.tokenAuth || ''}
                                onChange={(e) => handleValueChange('tokenAuth', e.target.value)}
                                placeholder="Token será generado automáticamente"
                            />
                            <Button
                                variant="outline"
                                onClick={() => handleValueChange('tokenAuth', `wh_${Math.random().toString(36).substr(2, 15)}`)}
                                className="gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Generar
                            </Button>
                        </div>
                    </div>
                )}
                {data.authType === "hmac" && (
                    <div className="space-y-2">
                        <Label>HMAC Secret</Label>
                        <div className="flex gap-2">
                            <Input
                                value={data.hmacSecret || ''}
                                onChange={(e) => handleValueChange('hmacSecret', e.target.value)}
                                placeholder="Secret será generado automáticamente"
                            />
                            <Button
                                variant="outline"
                                onClick={() => handleValueChange('hmacSecret', `wh_secret_${Math.random().toString(36).substr(2, 20)}`)}
                                className="gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Generar
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 