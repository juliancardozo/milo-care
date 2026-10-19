# Backend API Notes

## Dashboard Reminders Full List

### GET /api/dashboard/reminders/full

Returns all eligible reminders for the authenticated user in a single response.

### Query Parameters

- windowDays (optional): integer 1-60. Temporary override for look-ahead window.
- includeOverdue (optional): boolean, default true. Whether overdue reminders are included.

### Response Fields

- reminders: array of reminder items
- total: number of reminders
- windowDays: resolved window value
- windowSource: temporary-override | user-preference | default
- appliedAt: UTC timestamp used for evaluation
- appliedFallback: optional explanation when invalid window fallback is applied

### Deterministic Ordering

Reminders are ordered by:
1. dueAt ascending
2. sourceType priority: vaccination, medication, appointment
3. sourceId/sourceName ascending

## User Preferences

### PATCH /api/user/preferences/reminderWindow

Saves the authenticated user's reminder window preference.

Request body:

{
  "reminderWindowDays": 21
}

Validation: reminderWindowDays must be an integer between 1 and 60.

## Contract Reference

See API contract: specs/003-clarify-fr011-precedence/contracts/full-list-api.yaml

## Notificaciones Slack

Avisos internos en tiempo real hacia Slack (Incoming Webhooks, sin bot token ni OAuth)
para que el equipo vea cada acción relevante de usuarios. Implementado en
`src/services/SlackService.js`.

**Diseño:** _fire-and-forget_. Ninguna notificación bloquea ni rompe el flujo del
usuario: si Slack falla (timeout de 5s, error de red o 5xx → 1 reintento con backoff de
2s), solo se loguea el error. Si `SLACK_ENABLED !== 'true'` o falta `SLACK_WEBHOOK_URL`,
el servicio es un no-op silencioso (loguea un warn de arranque, una sola vez).

### Variables de entorno

```
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
SLACK_WEBHOOK_URL_BILLING=   # opcional, canal separado para upgrades/downgrades/límites
SLACK_WEBHOOK_URL_ALERTS=    # opcional, canal separado para bajas, resets y acciones admin
```

Si las URLs opcionales no están definidas, todo cae al webhook principal. Las URLs de
webhook **nunca** se loguean.

### Cómo crear el Incoming Webhook

1. Ir a <https://api.slack.com/messaging/webhooks> y crear (o reutilizar) una Slack App.
2. Activar **Incoming Webhooks** → **Add to Workspace**.
3. Elegir el canal destino (ej. `#milo-eventos`) y copiar la URL generada.
4. Pegarla en `backend/.env` (`SLACK_WEBHOOK_URL`). Repetir por canal si se usan los
   webhooks separados de billing/alertas.

Canales sugeridos: `#milo-eventos` (principal), `#milo-billing` (upgrades y límites de
tier), `#milo-alertas` (bajas, resets, acciones admin).

### Eventos ↔ canal

| Evento | Disparador | Canal |
|---|---|---|
| 🎉 Nuevo usuario registrado | `POST /auth/register` | principal |
| 🐶 Nuevo perro agregado (marca el 1er perro como activación) | `POST /dogs` | principal |
| ✅ Primer registro de vacuna/medicamento/cita/síntoma (solo el 1º de cada tipo por perro) | POST de cada recurso de salud | principal |
| 💎 Upgrade a Premium | webhook de pago (MP/Paddle) o panel admin | billing |
| 📉 Downgrade a Free | panel admin | billing |
| 🚧 Usuario free chocó el límite de 1 perro (señal de intención de upgrade) | `TierLimitError` en `POST /dogs` | billing |
| ⚠️ Cuenta eliminada | `DELETE /auth/me` | alerts |
| 🗑️ Perro eliminado | `DELETE /dogs/:dogId` | alerts |
| 🔑 Solicitud de reset de contraseña (solo si el email existe) | `POST /auth/forgot-password` | alerts |
| 🛡️ Acción de admin (cambio de rol/plan, edición, borrado) | mutaciones en `/api/admin/*` | alerts |
| 📊 Resumen diario | cron 09:00 `America/Argentina/Buenos_Aires` | principal |

> Los registros de salud **no** generan un aviso por cada carga (sería ruido): solo el
> primer registro de cada tipo por perro, como métrica de activación.

### Resumen diario

`src/services/DailySummaryJob.js` corre a las 09:00 hora de Argentina y publica en el
canal principal: nuevos usuarios y perros (24 h), upgrades/renovaciones y
downgrades/cancelaciones (24 h), y totales acumulados (usuarios, perros, % premium).

Notas de fidelidad (el modelo no persiste historial de cambios de tier ni de bajas —
las cuentas se borran en duro): nuevos usuarios/perros son exactos vía `createdAt`;
upgrades son una aproximación derivada de `premiumUntil`; las cuentas eliminadas se
reportan como `n/d` en el resumen y se cubren con el aviso en tiempo real de
`#milo-alertas`.
