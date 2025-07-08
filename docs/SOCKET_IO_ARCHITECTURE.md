# 🔌 SOCKET.IO – ARQUITECTURA Y FLUJOS DE CONEXIÓN

> **Contexto SaaS Clínicas & Centros de Belleza**
> Este documento describe cómo la plataforma utiliza Socket.IO para ofrecer tiempo real, tanto en entorno local (Next.js) como en el **servidor externo** desplegado en Railway.  Incluye detalles sobre la capa Redis para escalar, la segregación multi-tenant mediante `systemId` y las mejores prácticas para desarrollo.

---

## 1. Resumen de Componentes

| Capa | Archivo / Módulo | Rol |
|------|------------------|-----|
| Frontend | `hooks/useSocket.ts` | Conecta, mantiene estado y distribuye eventos a componentes React. |
| Backend  | `pages/api/socket.js` | Servidor Socket.IO local + puente a servidor externo. |
| Backend  | `app/api/websocket/[connectionId]/[action]/route.ts` | API REST para start/stop/restart conexiones y propagación vía Redis. |
| Servicio | Railway (Node) | Socket.IO + Redis, receptor de bridge externo. |
| Infra     | Redis (Upstash) | Propaga eventos entre procesos / Lambdas de Vercel. |

## 2. Flujo de Conexión

```mermaid
graph TD;
  A[Componente React] -- useSocket --> B[hooks/useSocket.ts]
  B -- WS connect --> C[/api/socket (Next.js)]
  C -- Redis Adapter --> D((Redis))
  C -- Bridge --> E[Servidor Socket.IO Railway]
  D -- Pub/Sub --> C
  E -- Broadcast --> C
  C -- emit --> B
  B -- state update --> A
```

1. `useSocket` determina `WS_URL` y realiza `fetch /api/socket/init` para despertar la lambda.
2. El servidor local (`pages/api/socket.js`) se inicia (si no existe) y configura el **Redis Adapter**.
3. Cada socket del navegador realiza `join-system` y queda aislado en el *room* `<systemId>`.
4. Si existe un servidor externo (`NEXT_PUBLIC_WS_URL`), se abre un *cliente puente* que re-envía eventos en ambas direcciones.
5. Las APIs REST o la lógica de dispositivos usan `global.broadcastDeviceUpdate()` para emitir al tenant adecuado.
6. En entornos con múltiples procesoss, Redis sincroniza los eventos.

## 3. Rooms y Multi-tenant

| Room | Participantes | Uso |
|------|--------------|-----|
| `<systemId>` | Navegadores + API route | Aislación de clínica/centro |
| `admin-dashboard` | Staff interno | Métricas y monitoreo |

## 4. Eventos Soportados

| Evento | Payload | Emisor principal | Descripción |
|--------|---------|------------------|-------------|
| `device-update` | `{deviceId, online, relayOn, …}` | Shelly WS Manager | Cambio de estado en tiempo real. |
| `device-offline-status` | idem | DeviceOfflineManager | Heart-beat que marca offline. |
| `smart-plug-assignment-updated` | `{deviceId, equipmentId,…}` | APIs Equipment | Cambio de asignación de enchufe. |
| `connection-status` | `{connected, socketId}` | Server → Cliente | Hand-shake inicial. |

## 5. Desconexión Forzada

1. POST `/api/websocket/{connectionId}/stop` actualiza BD y publica `shelly:disconnect` en Redis.
2. Todos los procesos reciben el mensaje y llaman a `shellyWebSocketManager.disconnectCredential()`.
3. Se ejecuta `global.forceSocketDisconnect()` para cerrar sockets navegadores.

## 6. Buenas Prácticas

* **Nunca** manipules directamente la instancia `io` fuera de `pages/api/socket.js`. Usa los *helpers globales*.
* Valida siempre `session?.user?.systemId` antes de emitir eventos desde front-end.
* Ajusta `RateLimiter` en caso de nuevos flujos muy intensos.
* Mantén la compatibilidad con la política de importación Prisma (`import { prisma } from '@/lib/db';`).

---

© SaaS Avatar – Arquitectura de Tiempo Real v1.0 