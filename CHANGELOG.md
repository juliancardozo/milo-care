# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

## [Unreleased]

### Added — Onboarding hiper-realista (Fase D)

- **Ficha en vivo** (`LivePetCard`): mientras el tutor completa el onboarding, se arma una
  tarjeta del perro que se actualiza en tiempo real (avatar, nombre, raza, edad calculada,
  sexo, tamaño, peso) con un **tip contextual** por etapa de vida (cachorro/adulto/senior) y
  raza braquicéfala. Aparece en cuanto el perro tiene nombre.
- **Foto desde el primer paso**: `PhotoInput` en el alta del perro; la foto se persiste en
  la sesión de onboarding y queda en la ficha del perro al confirmar (backend: `photoUrl` en
  `OnboardingSession.dog` + `saveStep`).
- **Encabezados personalizados** con el nombre: "La salud de {perro}", "¿Cómo vive {perro}?",
  "¡{perro} ya está listo!" — en vez de copys genéricos.

### Added — Health Score del perro (0–100)

- Nuevo servicio `healthScore` que calcula un puntaje **explicable** (0–100) con datos ya
  existentes: vacunas al día (30), desparasitación (15), ritual de check-in/racha (20),
  bienestar reciente/síntomas (15), perfil completo (10) y seguimiento veterinario (10).
  Cada factor devuelve puntos + un **hint accionable** ("cargá las vacunas para +30").
- Endpoint `GET /api/dogs/:dogId/health-score` (calcula la racha desde `DailyCheckin`).
- **Dashboard**: `HealthScoreCard` con **anillo de progreso** animado, grado de color
  (Excelente/Muy bien/A mejorar/Necesita atención), la **mejor próxima acción** y un
  desglose expandible por factor. Es el "por qué volver" de la app. Mobile-safe.
- Tests: `healthScore` (6 casos). Suite backend **155/155** verde.

### Fixed — PDF de salud responsive en móvil

- La vista `/dogs/:id/pdf-export` desbordaba en móvil porque el template era fluido.
  Ahora el template se renderiza a **ancho A4 fijo (794px)** —el PDF sale consistente desde
  cualquier dispositivo— y el **preview se escala** para entrar en cualquier viewport sin
  scroll horizontal (escala calculada en runtime + recálculo en resize).

### Changed — Topbar más profesional (idioma + menú de usuario)

- **Idioma de una sola acción**: el `LanguageSwitcher` pasa de dos burbujas (🇪🇸/🇺🇸 +
  atajo "←") a un **toggle único** que muestra el idioma actual (ES/EN) y al tocarlo cambia
  al otro. Menos ruido, una sola decisión.
- **Menú de usuario sin lista eterna de perros**: en vez de un ítem "Editar ficha de X" por
  cada perro, ahora hay un **segundo nivel** — "Editar una ficha (N) ▸" que despliega los
  perros con avatar y **scroll** si son muchos. Con 1 perro muestra el atajo directo; con 0,
  "Agregar primer perro". Baja la carga cognitiva con cualquier cantidad de mascotas.

### Added — Medicamentos de dosis única (sin frecuencia ni fecha de fin)

- Nuevo toggle **"Dosis única"** en el alta de medicamentos: para tomas puntuales
  (ej. antiparasitario), la **frecuencia y la fecha de fin dejan de ser obligatorias** y se
  ocultan. La tarjeta muestra un chip "Dosis única" en lugar de la frecuencia.
- **Backend**: `medicationSchema.oneTime` (bool) y `frequencyHours`/`nextReminderAt` ahora
  opcionales (`default: null`); la ruta POST solo exige frecuencia para recurrentes.
- **Bug latente corregido**: el schema usaba `status` pero la ruta filtraba/escribía
  `isActive` (campo inexistente) → el filtro de activos no funcionaba. Se agregó
  `isActive` (bool, default true) al schema, así "En curso/Finalizados" y `?active=true`
  funcionan de verdad. Suite backend 149/149 verde.

### Changed — Rediseño de Síntomas y Medicamentos (hiperpersonalizado + mobile-safe)

- **Bug móvil corregido**: en Síntomas (y Medicamentos) los registros volcaban sus campos
  como hijos sueltos de un flex `.record-item`, por lo que el botón **Eliminar se salía de
  pantalla**. Ahora cada registro es una **tarjeta real** con footer de acciones que envuelve
  y nunca desborda (nuevo `health-records.css`).
- **Hiperpersonalización**: hero con el nombre del perro — *"¿Qué le pasó hoy a {perro}?"*
  (síntomas) y *"El botiquín de {perro}"* (medicamentos), con estados vacíos cálidos
  (*"{perro} está sin novedades 🐾"*). Se obtiene el nombre vía `getDog`.
- **Síntomas**: acento de color por severidad (leve/moderado/severo), chips de fecha y
  registro rápido, contador en el hero.
- **Medicamentos** (antes con pinta de beta): secciones **En curso / Finalizados**, chips de
  dosis · frecuencia · inicio · fin, tarjetas atenuadas para inactivos y acciones claras.

### Changed — Salud en hoja nativa (dashboard móvil aún más limpio)

- En móvil se **quita la sección "Registros de salud"** de debajo del panel: la salud
  completa (vacunas, medicación, turnos, síntomas, historial) vive ahora en la **hoja
  "Salud"** que abre la barra inferior (bottom sheet nativo). El dashboard móvil queda
  reducido a lo esencial: ritual (check-in) + "Lo de hoy".
- `BottomNav` refactorizado a un patrón de hoja genérico reutilizado por "Salud" y "Más".

### Fixed — Ajuste responsive móvil (todo dentro de pantalla, carga cognitiva cero)

- **Guardas globales anti-overflow**: `overflow-x: clip` en `html/body` (no rompe el
  `sticky` del topbar como sí lo haría `hidden`), `text-size-adjust`, `img/svg` con
  `max-width:100%` y `-webkit-tap-highlight-color` transparente.
- **Topbar móvil compacto** (≤640): se oculta el menú "Explorar" (redundante con la barra
  inferior; sus CTAs se movieron a "Más"), el atajo "← inicio" del idioma y el nombre +
  chevron del UserMenu (solo avatar). Marca con elipsis. Deja de desbordar en 320–390px.
- **Tarjeta de perfil**: fila limpia con `min-width:0` y elipsis en nombre/raza/edad,
  avatar 60px, sin botones que la desborden (Wallet/editar salen del card en móvil).
- **"Más" enriquecido**: ahora incluye **Wallet** e **instalar app** (con hint iOS), para
  no perder nada al ocultar "Explorar" en móvil.
- Breakpoint del dashboard unificado a **640px** (alineado con la barra inferior) + ajuste
  fino para pantallas ≤360px (iPhone SE).

### Changed — Dashboard móvil de baja carga cognitiva

- **Barra de navegación inferior (móvil)**: nuevo `BottomNav` con feeling de app nativa
  — `Inicio · Salud · ➕ · Álbum · Más`. El "+" central abre la hoja de registro rápido
  (`QuickActionsFab` ahora soporta modo controlado `open`/`onOpenChange`); en desktop se
  mantiene el FAB flotante. "Más" abre una hoja inferior con el resto de destinos.
- **Dashboard reorganizado en 3 zonas** para bajar la carga cognitiva: ritual (check-in) →
  **"Lo de hoy"** (recordatorios promovidos arriba, con estado "todo al día") → **Salud**
  como fila compacta de *pills* (antes 5 tarjetas grandes que competían por atención).
- **Resumen de salud (PDF)** movido del dashboard al menú *Explorar* y a la hoja "Más".
- i18n ES/EN: `bottomNav.*`, `explore.pdf.*`, `dashboard.todayClear`.

### Added — Notificaciones push (Web Push / VAPID)

- **Backend**: `web-push` + claves VAPID (env). Modelo `PushSubscription`, `pushService`
  (suscribir, enviar, **limpieza automática de suscripciones expiradas 404/410**),
  rutas `GET /api/push/vapid-key`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`.
  Flag `PUSH_ENABLED`; si faltan claves, el servicio queda inactivo sin romper nada.
- **Canal por usuario** `notificationPreferences.channel` (`email` | `push` | `both`).
  El `CheckinJob` envía el check-in por el canal elegido respetando 1 notificación/día.
  El push lleva la pregunta del día con **acciones bien/regular/mal** que registran la respuesta.
- **GDPR**: el borrado de cuenta elimina también las suscripciones push.
- **Frontend (PWA)**: `manifest.webmanifest` + `sw.js` (Service Worker: `push` y `notificationclick`),
  registro del SW, `pushApi` + `utils/push` (permiso, suscripción VAPID), opt-in en Preferencias
  con selector de canal y aviso para iOS (requiere instalar la PWA). Dominio corregido a milocare.online en `index.html`.
- **Tests**: `pushService` (envío + limpieza de expiradas) y contract de las rutas. Suite: 149/149 verdes.

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
