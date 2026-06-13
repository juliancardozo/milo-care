# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

## [Unreleased]

### Added — Retrofit 2.0 · Incremento 1: Event bus + colección `events`

Inicio del retrofit del [modelo de datos v1](docs/data-model.md) sobre `milocura` (ver [ADR-001](docs/adr/ADR-001-modelo-de-datos.md)).

- **`core/events/catalog.js`**: catálogo tipado cerrado de eventos (§2 del modelo). Valida cada payload —
  solo enums, números, booleanos y códigos controlados; rechaza tipos desconocidos, campos extra y texto libre.
- **`models/Event.js`**: colección `events` append-only (`type`, `userId`, `dogId`, `zoneId`, `payload`, `ts`).
- **`core/events/eventBus.js`**: `emitEvent` (valida contra el catálogo y persiste; fire-and-forget, no lanza) +
  `deleteUserEvents` (borrado GDPR por `userId`).
- **`analyticsService`** migrado a adaptador: traduce los nombres legacy (`checkin_answered`, `quick_symptom_logged`,
  …) al catálogo (`checkin.answered`, `symptom.logged`, …) y emite por el bus. `AnalyticsEvent` eliminado.
- **Métricas admin** (`/api/admin/metrics/summary`) ahora leen del event log (`events`, campo `ts`, nombres del catálogo).
- **GDPR**: el borrado de cuenta (usuario y admin) elimina también los eventos del `userId`.

**Tests**: invariantes del catálogo (tipo/enum/campo extra/texto libre), bus (válido/inválido/fallo de persistencia/GDPR)
y mapeo legacy→catálogo. Suite: 137/137 verdes.

### Added — Fase 3: Tarjetas compartibles de hitos (viralidad orgánica)

**Backend**
- `milestoneService.detectMilestones` (puro): rachas 7/30/100, primer mes, 100 días con vacunas al día,
  cumpleaños del perro (en la TZ del usuario) y N logros del Álbum (5/10/25).
- Modelo `Milestone` (índice único `{ dogId, key }`) → cada hito se celebra **una sola vez**.
- Rutas `GET /api/dogs/:dogId/milestones` (detecta + persiste nuevos vía upsert idempotente, devuelve
  `pending`/`history` + `referralCode`), `POST /:key/seen` (`milestone_shown`), `POST /:key/share`
  (`card_shared`/`card_downloaded`).

**Frontend**
- `config/milestoneTemplates.js`: todo el copy de hitos + plantillas de "mensajes de amor" (carta, certificado,
  cumpleaños) centralizado ES/EN. Nada hardcodeado en componentes.
- `utils/milestoneCard.js`: pipeline de **canvas** con crop centrado para cualquier proporción, branding sutil,
  **código de referido** en la tarjeta (Fase 4), formatos 1080×1080 y 1080×1920, Web Share API con fallback a
  descarga, y **fallback de patitas** si la foto no permite CORS.
- `MilestoneCelebration`: modal que aparece **una sola vez** al detectar un hito (marca `seen` al mostrarse).
- `CardsPage` (`/dogs/:dogId/cards`): generador libre de "mensajes de amor". Accesos desde el dashboard.

**Tests**
- `milestoneService` (unit: cada tipo de hito + cumpleaños por TZ) y `milestones-contract` (detección/persistencia,
  pending vs history, seen, share). Suite: 120/120 verdes.

### Added — Fase 5: Geolocalización opt-in + alertas locales

**Backend**
- `User.location` (`{ country, region, city }`, subdoc `_id:false`) + `locationConsentAt`. **El schema no contempla
  coordenadas** — lat/lng se descartan (test de invariante en strict mode). Selección manual de zona, sin geocoding.
- `config/localAlertRules.js`: temporadas de garrapatas/pulgas y de calor por país AR/UY (meses + copy), editable sin lógica.
- `localAlertsService.getActiveLocalAlerts` (puro): cruza zona + mes (en la TZ del usuario) + raza (calor solo para
  braquicéfalos, match estricto) → alertas preventivas con la zona interpolada.
- **Presupuesto de notificación**: las alertas locales se **fusionan en el email diario del check-in** (`CheckinJob`
  + `sendDailyCheckin`), garantizando nunca 2 emails el mismo día.
- Rutas `PATCH /api/user/location` (opt-in + consentimiento, evento `location_optin`) y `DELETE /api/user/location`
  (borra zona en 1 tap, evento `location_deleted`). `location` incluida en las respuestas de auth.

**Frontend**
- `LocationPicker` (país + provincia/departamento AR/UY + ciudad), `config/regions.js`.
- `LocationConsentModal`: opt-in en momento de valor (temporada relevante), con ejemplo concreto y promesa de
  privacidad explícita (solo ciudad/zona, nunca publicidad, borrable). Se descarta sin insistir.
- Sección "Tu zona" en Preferencias: ver / editar / **borrar en 1 tap**. Strings i18n ES/EN.

**Tests**
- `localAlerts` (unit: temporada tick, calor solo braquicéfalo, sin zona = sin alertas, invariante sin coordenadas)
  y `location-contract` (opt-in, borrado, eventos). Suite: 110/110 verdes.

### Added — Fase 4: Referidos recíprocos + recompensa sorpresa

**Backend**
- **Premium con vencimiento**: `User.premiumUntil` + métodos `isPremiumActive()`, `effectiveTier()`,
  `grantPremiumDays()`. `TierService` y `billing` ahora usan premium efectivo; auth expone `effectiveTier`/`premiumUntil`.
- `User.referralCode` (permanente, único, `MILO-XXXX`) — generado en el registro.
- Modelo `Referral` (pending → activated, un doc por invitado, índice único sobre `referredUserId`).
- `referralService`: alta de referido en el registro, **activación en el primer check-in**, recompensa
  recíproca **+30 días** (45 si el código está potenciado), anti-abuso (sin auto-referencia, email distinto,
  un referido por persona, **cap 10/mes**).
- Activación enganchada al check-in (app + email), idempotente y fire-and-forget.
- `surpriseService` + `config/surprisePool.js`: recompensa variable (`SURPRISE_PROBABILITY`, default 0.15),
  **≤1/día**, después de la confirmación del check-in. Pool: dato de raza, sticker, código potenciado (45 días/48h).
- Rutas: `GET /api/referrals/me`, `POST /api/referrals/shared`, `GET /api/dogs/:dogId/surprise`. Email `sendReferralActivated`.
- Eventos `referral_signup`, `referral_activated`, `referral_link_shared`, `surprise_shown`.

**Frontend**
- Captura de `?ref=CODE` (localStorage) hasta el registro; `RegisterPage` lo envía y muestra banner de invitación.
- `ReferralCard` en Mi Cuenta: código, copiar link, compartir por WhatsApp con mensaje pre-armado, lista de referidos.
- `SurpriseModal` "Milo encontró algo enterrado 🦴" tras el check-in (no interrumpe la confirmación).
- Dashboard usa el **tier efectivo** (premium por referido no ve el banner de upgrade). Strings i18n ES/EN.

**Tests**
- `referralService` (anti-abuso + activación recíproca + cap + boost) y `surpriseService` (probabilidad, ≤1/día, pool). Suite: 101/101 verdes.

### Added — Fase 2: Registro rápido (vómitos y conductas)

**Backend**
- `symptomSchema` extendido con `quickType`, `photoUrl`, `isQuickLog` (registro rápido sin romper síntomas existentes).
- `POST /api/dogs/:dogId/symptoms/quick`: captura en ≤2 taps (tipo acotado, timestamp automático,
  `severity: moderate`, foto opcional). PATCH extendido para completar/limpiar el registro rápido.
- `symptomAlertService.evaluateVomitRule` (puro): ≥2 vómitos/24h en adultos o 1 en cachorros (<12 meses).
  Al dispararse: `alert` en la respuesta + email `sendSymptomAlert` ("Esto amerita una consulta" + CTA a cita).
- Modelo `BehaviorLog` (colección propia, separada del historial médico) + CRUD `/api/dogs/:dogId/behaviors`.
- Eventos de analítica `quick_symptom_logged` y `behavior_logged`.

**Frontend**
- Botón flotante "+" (`QuickActionsFab`) en el dashboard con 3 accesos: síntoma rápido, ¡logro!, travesura
  (mini-forms de 1 pantalla). El síntoma rápido muestra la alerta acumulativa con CTA a agendar cita.
- Pestaña "Álbum" (`AlbumPage`): feed cálido de logros/travesuras/momentos, visualmente separado del clínico.
- Badge "registro rápido" en el módulo de síntomas existente. Strings i18n ES/EN.

**Tests**
- `symptomAlert` (unit, regla acumulativa) y `fase2-contract` (quick + alerta + CRUD behaviors). Suite: 87/87 verdes.

### Added — Fase 1: Check-in diario "¿Cómo está [perro] hoy?"

**Backend**
- Modelo `DailyCheckin` (colección propia, índice único `{ dogId, localDate }` → 1 por perro/día).
- Modelo `AnalyticsEvent` + `analyticsService.track` (fire-and-forget) para instrumentar engagement.
- `checkinQuestionService`: rotación determinística con cobertura semanal de las 5 categorías
  (comida, energía, agua, ánimo, digestión) + especialización por `symptomRiskRules` (ej. braquicéfalo
  con energía baja → foco respiratorio).
- `checkinTokenService`: tokens JWT firmados de un solo uso para responder desde el email sin login
  (single-use garantizado por el índice único del check-in).
- `checkinAnalytics`: tendencias 7/30 días, detección de patrones (≥2 negativas consecutivas) y racha sin culpa.
- `CheckinJob` (node-cron cada 15 min): email diario en el horario local del usuario, idempotente
  (`checkinLastSentOn`), respetando 1 email/día y consolidando todos los perros en un solo correo.
- Rutas: `GET/POST /api/dogs/:dogId/checkins`, `/today`, `/trends`, `/streak` y público `GET /api/checkins/respond`.
- Email `sendDailyCheckin` (copy cálido en voseo, variantes especializadas por foco).
- `GET /api/admin/metrics/summary` con KPI norte (% usuarios con check-in ≥5 días/semana) y series semanales.
- `User.notificationPreferences`: `checkinEnabled` (toggle por usuario), `checkinHour`, `timezone`, `checkinLastSentOn`.
- `PATCH /api/auth/me/notifications` acepta `checkinEnabled`, `checkinHour` y `timezone`.
- Feature flag de despliegue `CHECKIN_ENABLED` (apaga el cron; las rutas quedan disponibles).

**Frontend**
- `CheckinCard` en el dashboard (pregunta del día, 3 botones, nota opcional, animación de agradecimiento, racha).
- `CheckinTrends` (barras por categoría a 30 días + banner de patrón negativo con CTA a agendar cita).
- Toggle del check-in diario y horario en Preferencias de notificación.
- Sección "Seguimiento Diario" (resumen semanal) en el PDF exportable.
- Strings i18n ES/EN del check-in.

**Tests**
- `checkinQuestion`, `checkinAnalytics` (unit) y `checkin-contract` (token válido/expirado/reusado, 1/día). Suite: 74/74 verdes.
