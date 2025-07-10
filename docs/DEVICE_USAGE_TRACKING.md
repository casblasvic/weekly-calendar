# Device Usage Tracking (Smart Plugs)

> Context: SaaS clinics – real-time monitoring of treatment equipment via Shelly smart-plugs. 100 % event-driven, no cron jobs.

## 1. Tables & relationships

| Table | Purpose | Key fields |
|-------|---------|-----------|
| `appointments` | Core booking | `startTime`, `endTime`, `durationMinutes`, `estimatedDurationMinutes` |
| `appointment_extensions` | Every manual resize/extension | `previousDuration`, `newDuration`, `extendedMinutes`, `reason` |
| `appointment_device_usage` | One row **per ON cycle** of a plug | see model below |
| `SmartPlugDevice` | Physical plug + config | `autoShutdownEnabled`, `powerThreshold` |

### AppointmentDeviceUsage model
```prisma
model AppointmentDeviceUsage {
  id                 String   @id @default(cuid())
  appointmentId      String
  deviceId           String
  equipmentId        String?
  startedAt          DateTime
  endedAt            DateTime?
  estimatedMinutes   Float    // copied snapshot at ON
  actualMinutes      Float?
  energyConsumption  Float?
  currentStatus      DeviceUsageStatus @default(ACTIVE)
  endedReason        UsageEndedReason?
  usageOutcome       UsageOutcome?
  pausedAt           DateTime?
  pauseIntervals     Json?
  deviceData         Json?
  ...
}
```

*Enums*
```prisma
enum DeviceUsageStatus { ACTIVE PAUSED COMPLETED }
enum UsageEndedReason  { MANUAL AUTO_SHUTDOWN APPOINTMENT_CLOSED POWER_OFF_REANUDABLE }
enum UsageOutcome      { EARLY ON_TIME EXTENDED }
```

## 2. Real-time flow

```mermaid
sequenceDiagram
  ShellyHW-->WebSocket: JSON (power, relay, totalEnergy)
  WebSocket->>deviceOfflineManager: trackActivity()
  deviceOfflineManager-->>FloatingMenuHook: callback(update)
  FloatingMenuHook->>/live-sample: POST sample (event-driven)
  /live-sample->>DB: UPDATE appointment_device_usage
  /live-sample-->>FloatingMenuHook: { warning, endedReason }
  FloatingMenuHook-->>QuickMenu: setStatus (paused / auto_shutdown / over_used)
```

## 3. Status → visual mapping

| Visual | `deviceStatus` | `currentStatus` | `endedReason` | Notes |
|--------|----------------|-----------------|---------------|-------|
| 🔵 Azul (paused) | `paused` | COMPLETED | POWER_OFF_REANUDABLE | Reactivable. New usage created on next ON. |
| 🟠 Naranja (stand-by) | `in_use_this_appointment` + relay ON, power ≤ threshold | ACTIVE | — | |
| 🟢 Verde (active) | `in_use_this_appointment` + power > threshold | ACTIVE | — | |
| 🔴 Rojo (over_used) | `over_used` | ACTIVE | — | Minutes ≥ estimatedMinutes |
| 🟣 Magenta (auto_shutdown) | `auto_shutdown` | COMPLETED | AUTO_SHUTDOWN | Plug turned OFF by backend |
| 🚫 Rojo claro (occupied) | `occupied` | — | — | Plug belongs to another appointment |
| ⚫ Gris (offline) | `offline` | — | — | Plug unreachable |

## 4. Usage lifecycle logic (server)

1. **Start service** (`/assign-device`)
   * Insert `AppointmentDeviceUsage` row – `estimatedMinutes` = current `appointment.durationMinutes`.
2. **/live-sample** (every Shelly message)
   * If ACTIVE ➜ update `actualMinutes`, `energyConsumption`.
   * If relay OFF during ACTIVE ➜ mark `COMPLETED`, `POWER_OFF_REANUDABLE`, calc `usageOutcome`.
   * If PAUSED and relay ON again ➜ new ACTIVE row.
   * If `actualMinutes ≥ estimatedMinutes` ➜ `warning=true`.
   * If `warning && autoShutdownEnabled` ➜ send control OFF, mark `AUTO_SHUTDOWN`, `EXTENDED`.
3. **Resize/extension** (`PUT /api/appointments`)
   * Update `appointment.durationMinutes`.
   * `UPDATE appointment_device_usage` rows ACTIVE/PAUSED → `estimatedMinutes = newDuration`.
4. **Manual OFF** (button)
   * Mark `COMPLETED`, `endedReason=MANUAL`, calc `usageOutcome`.
5. **Appointment closed**
   * Backend sets `endedReason=APPOINTMENT_CLOSED`, `usageOutcome` recalculated.

## 5. Analysis SQL snippets

```sql
-- Extensiones por servicio
SELECT serviceId, usageOutcome, COUNT(*)
FROM appointment_device_usage
GROUP BY serviceId, usageOutcome;

-- Clientes con sobre-uso frecuente
SELECT a.personId, COUNT(*) AS extended_uses
FROM appointment_device_usage u
JOIN appointments a ON a.id=u.appointmentId
WHERE u.usageOutcome='EXTENDED'
GROUP BY a.personId
ORDER BY extended_uses DESC;
```

## 6. Color classes (Tailwind)

| Status | Button BG | Ring |
|--------|-----------|------|
| paused | `bg-sky-500` | `ring-sky-500` |
| standby | `bg-orange-500` | `ring-orange-500` |
| active | `bg-green-500` | `ring-green-500` |
| over_used | `bg-red-700` | `ring-red-600` |
| auto_shutdown | `bg-fuchsia-600` | `ring-fuchsia-600` |
| occupied | `bg-red-500` | — |
| offline | `bg-gray-400` | — |

---
Maintainer: **SmartPlug team** – Last updated: 2025-07-10 