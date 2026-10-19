# Ambientes de Milo Care: runbook

> Estado verificado el **2026-10-19**. Cada cambio de infraestructura tiene que actualizar este archivo y el mapa de `.claude/agents/milo-devops.md`.

## 1. Mapa de ambientes

| | Local | Staging (a crear) | Producción |
|---|---|---|---|
| Frontend | Vite `:5173` (`docker compose up` o `npm run dev`) | Amplify rama `develop`: `https://develop.d2d3bj1p216a32.amplifyapp.com` | Amplify rama `main`: `https://milocare.org` (+ `www`) |
| Cómo llega a la API | Proxy de Vite `/api` → `VITE_BACKEND_URL` o `http://localhost:3001` | **Hoy**: proxy de Amplify `/api` → backend de **prod**. **Objetivo**: `VITE_API_BASE_URL=https://milo-care.onrender.com/api` (llamada directa con CORS) | Proxy de Amplify (custom rule a nivel app) `/api/<*>` → `https://milo-care-production.onrender.com/api/<*>` |
| Backend | Express `:3001` | Render `milo-care` (free, rama `develop`) | Render `milo-care-production` (free): `https://milo-care-production.onrender.com` |
| DB | `mongo:7` en docker (`milocura`) | Atlas DB `milocura-staging` (usuario propio) | Atlas DB `milocura` (URI solo en el dashboard de Render) |
| Email | Resend con `onboarding@resend.dev` | Resend (`noreply@milocare.org`), con datos de prueba | Resend `noreply@milocare.org` |
| Pagos | sandbox | Paddle sandbox / MP `TEST-` | Paddle / MP prod |
| Crons | node-cron in-process | node-cron in-process (opcional: cron externo) | node-cron in-process **+** GitHub Actions `cron.yml` |

> ⚠️ **Hasta que exista staging, la rama `develop` de Amplify usa el backend y la DB de PRODUCCIÓN.** Todo lo que se haga en `develop.d2d3bj1p216a32.amplifyapp.com` (registros, emails, pagos) es real.

Otros servicios:

| Pieza | Servicio | Notas |
|---|---|---|
| DNS + registrar | Cloudflare | Ver [`DNS-MIGRATION.md`](../../DNS-MIGRATION.md) |
| TLS | ACM us-east-1 (cert custom de Amplify `ed2d22fd-…`, vence 2027-01-10) | **Faltan los CNAME de validación en Cloudflare** (ver DNS-MIGRATION) |
| Email saliente | Resend, dominio `milocare.org` (return-path `send.`, SES sa-east-1) | SPF + DKIM OK. DMARC pendiente |
| Email entrante | Cloudflare Email Routing | **Pendiente** |
| Cuenta AWS | `013960777529`, us-east-1 | Usuario IAM `milo-devops` para el CLI (perfil `milo-devops`) |

## 2. Cómo se deploya cada pieza

### Frontend (AWS Amplify `d2d3bj1p216a32`)

`amplify.yml`: `cd frontend && npm ci && npm run build` → artefacto `frontend/dist`.

| Rama | Auto-build | Cómo deployar |
|---|---|---|
| `develop` | **ON** | push a `develop` |
| `main` | **OFF** | Manual, después de mergear a `main`: |

```bash
aws --profile milo-devops amplify start-job --app-id d2d3bj1p216a32 --branch-name main --job-type RELEASE
aws --profile milo-devops amplify list-jobs --app-id d2d3bj1p216a32 --branch-name main --max-items 1   # seguir el estado
```

**Custom rules (rewrites/redirects): son a nivel APP, no por rama.** Tanto `aws amplify get-app` (`customRules`) como `update-app --custom-rules` operan sobre la app; `get-branch`/`update-branch` no tienen ese campo. Por eso la rama `develop` no puede tener un proxy `/api` que apunte a otro backend. La solución es la variable de build `VITE_API_BASE_URL` **por rama** (`frontend/src/config/apiBase.js`):

- Sin variable (prod, `main`): `/api` → proxy de Amplify → Render prod. **No cambia nada en producción.**
- Con variable (solo `develop`): el SPA llama directo a `https://milo-care.onrender.com/api`. El backend de staging lo permite por CORS (`APP_URL` = dominio de develop; orígenes extra en `CORS_ALLOWED_ORIGINS`). La auth usa Bearer en `localStorage`, no cookies, así que no hay problema con cookies cross-site.

Comando para cuando exista el backend de staging. **Ojo: `--environment-variables` reemplaza el mapa completo de la rama**, y hoy está vacío:

```bash
aws --profile milo-devops amplify update-branch --app-id d2d3bj1p216a32 --branch-name develop \
  --environment-variables VITE_API_BASE_URL=https://milo-care.onrender.com/api
aws --profile milo-devops amplify start-job --app-id d2d3bj1p216a32 --branch-name develop --job-type RELEASE
```

Limitaciones conocidas en `develop` con staging:
- `public/sw.js` (service worker) sigue haciendo `fetch('/api/notifications/clicked')` relativo. En `develop` ese tracking de clicks de push va a **prod** vía el proxy. Es best-effort y push está apagado (`PUSH_ENABLED=false`). Si se activa push en staging, hay que parametrizarlo.
- Los links de los emails usan `APP_URL` / `API_URL` del backend que los manda, así que en staging apuntan bien.

Rollback de `develop` (vuelve al proxy `/api` → prod): `aws --profile milo-devops amplify update-branch --app-id d2d3bj1p216a32 --branch-name develop --environment-variables '{}'` + `start-job` de `develop`. No hace falta borrar la rama.

### Backend (Render)

- Producción: servicio `milo-care-production` (rama `main`; confirmarlo en el dashboard), auto-deploy al pushear. Free: **duerme a los ~15 min sin tráfico**, y el primer request tarda ~30–50 s.
- Staging: servicio `milo-care` (`srv-d86ej1d7vvec73cckrpg`, rama `develop`), base `milocura-staging` en el mismo cluster Atlas (desde 2026-10-19). Hasta mergear este PR y setear `VITE_API_BASE_URL`, el preview de `develop` sigue llamando al backend de prod vía el proxy de Amplify.
- `render.yaml` es la referencia de configuración. Las keys con `sync: false` se cargan a mano y Render nunca las pisa.

### DB (MongoDB Atlas)

- Prod: cluster free (M0, según specs; confirmarlo en Atlas), DB `milocura`. La URI está solo en Render.
- Staging: DB `milocura-staging` con un **usuario distinto** que solo tenga permisos sobre esa DB.

## 3. Inventario de env vars del backend

Fuente: `grep -rhoE "process\.env\.[A-Z_]+" backend/src | sort -u` (39 vars, más `CRON_SECRET` del PR del cron externo). Todas están en `render.yaml` para ambos servicios. 🔒 = secreto (`sync: false`).

| Var | Uso | Prod | Staging |
|---|---|---|---|
| `MONGODB_URI` 🔒 | `config/db.js` | Atlas `milocura` | Atlas `milocura-staging` |
| `JWT_SECRET` 🔒 | auth | propio | **distinto** de prod |
| `JWT_EXPIRES_IN` | auth | `7d` | `7d` |
| `PORT` | server | `3001` (Render inyecta el suyo) | idem |
| `NODE_ENV` | (no se lee en `src`) | `production` | `production` |
| `APP_URL` | CORS + links | `https://milocare.org` | `https://develop.d2d3bj1p216a32.amplifyapp.com` |
| `CORS_ALLOWED_ORIGINS` | CORS extra (coma) | vacío | `http://localhost:5173` |
| `API_URL` | links one-click del check-in | `https://milocare.org` (seteada 2026-10-19) | `https://milo-care.onrender.com` (seteada 2026-10-19) |
| `API_PUBLIC_URL` | webhook MP (default APP_URL) | 🔒 manual | URL de staging |
| `VET_SHARE_PUBLIC_BASE_URL` | links vet-share | `https://milocare.org` | develop |
| `WALLET_PUBLIC_BASE_URL` | QR del pase | `https://milocare.org` | develop |
| `RESEND_API_KEY` 🔒 | email | propio | key aparte (ideal) |
| `RESEND_FROM_EMAIL` | email | `noreply@milocare.org` | idem |
| `BILLING_NOTIFY_EMAIL` | avisos Premium | Gmail del owner | idem |
| `CRON_SECRET` 🔒 | `/api/internal/cron/:job` | = `secrets.CRON_SECRET` de GitHub | opcional |
| `CHECKIN_ENABLED` | flag | `false` | `false` |
| `REMINDER_FULL_LIST_ENABLED` | flag (default on) | — | — |
| `VET_SEAL_ENABLED` | flag (default on) | — | — |
| `PUSH_ENABLED` | flag | `false` | `false` |
| `COMPANION_ENABLED` | flag B2B2C + metering | `true` | `true` |
| `GOOGLE_WALLET_ENABLED` | flag | `true` | `false` |
| `GOOGLE_WALLET_ISSUER_ID` 🔒, `GOOGLE_WALLET_SA_KEY_B64` 🔒, `GOOGLE_WALLET_CLASS_ID`, `WALLET_LOGO_URL` | Wallet | | |
| `VAPID_PUBLIC_KEY` 🔒, `VAPID_PRIVATE_KEY` 🔒, `VAPID_SUBJECT` | push | | |
| `BILLING_PROVIDER`, `BILLING_CONSENT_VERSION` | cobro B2C | 🔒 manual | sandbox |
| `PADDLE_API_KEY` 🔒, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET` 🔒, `PADDLE_API_URL` | Paddle | prod | `https://sandbox-api.paddle.com` |
| `MERCADOPAGO_ACCESS_TOKEN` 🔒, `PREMIUM_PRICE`, `PREMIUM_CURRENCY` | MP | prod | `TEST-…` |
| `ANTHROPIC_API_KEY` 🔒, `MILO_BOT_MODEL`, `MILO_BOT_MAX_TOKENS` | Milo Bot | | opcional |
| `SURPRISE_PROBABILITY` | sorpresas | `0.15` | `0.15` |

**Lo que faltaba en `render.yaml` antes de este cambio** (y por lo tanto no estaba documentado; si está cargado en el dashboard de Render no se puede verificar sin acceso): `API_PUBLIC_URL`, `BILLING_PROVIDER`, `BILLING_CONSENT_VERSION`, `PADDLE_API_KEY`, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_URL`, `MERCADOPAGO_ACCESS_TOKEN`, `PREMIUM_PRICE`, `PREMIUM_CURRENCY`, `REMINDER_FULL_LIST_ENABLED`, `VET_SEAL_ENABLED`, `WALLET_LOGO_URL`, y `CORS_ALLOWED_ORIGINS` (nueva). Además `RESEND_FROM_EMAIL` estaba **duplicada** (una con `sync: false` y otra con valor). Se dejó solo el valor.

Frontend (build time, Amplify por rama): `VITE_API_BASE_URL` (default `/api`), `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENV`. Hoy ninguna rama tiene variables cargadas en Amplify.

## 4. Crons

| Job | In-process (node-cron) | Externo (`.github/workflows/cron.yml`) | Idempotencia |
|---|---|---|---|
| `reminders` | `*/5 * * * *` | `*/5 * * * *` | limpia `nextReminderAt`/`reminderAt`; medicación avanza `frequencyHours` |
| `checkins` (si `CHECKIN_ENABLED`) | `*/15 * * * *` | `2,17,32,47 * * * *` | `checkinLastSentOn` por día local |
| `campaigns` | `0 * * * *` | `7 * * * *` | `overdueNotifiedAt` (14 d), `lastReengagementOn` (7 d) |
| `metering` (si `COMPANION_ENABLED`) | `0 3 * * *` | `13 3 * * *` | upsert `partnerId+month`; cobro con idempotencyKey |

- **Por qué hay cron externo:** Render free duerme el proceso y los node-cron no corren mientras tanto. GitHub Actions hace `POST https://milocare.org/api/internal/cron/<job>` con el header `X-Cron-Secret`. Eso despierta el servicio (timeout de 75 s y 4 reintentos) y dispara el job.
- **Doble ejecución:** el lock en memoria (`backend/src/services/jobLock.js`) es compartido por los dos disparadores dentro del proceso. Si ya hay una corrida, el endpoint responde `already_running`. No cubre **dos procesos** a la vez (solapamiento de segundos durante un deploy en Render, o varias instancias). Si se escala, hay que agregar un lock en DB (colección `job_locks` con `findOneAndUpdate` + TTL).
- **Restricciones de GitHub:** los `schedule` solo corren desde la rama por defecto (`main`), pueden atrasarse o saltearse en horas pico, y en repos públicos se desactivan tras 60 días sin actividad. Para pausar: `vars.CRON_ENABLED=false`. Para dispararlo a mano: Actions → cron → Run workflow.
- Probar a mano: `curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://milocare.org/api/internal/cron/reminders` → `202 {"status":"started"}`.

## 5. Backups de Atlas

Un cluster **M0 (free) no tiene backups ni snapshots** en Atlas. Si se borra o se corrompe la DB, se pierde todo. Propuesta (no implementada):

1. Un usuario de Atlas `backup-ro` con rol `read` sobre `milocura`.
2. `mongodump` diario y cifrado, fuera de GitHub artifacts (**el repo es público y los artifacts quedan descargables**):
   ```bash
   mongodump --uri "$MONGODB_BACKUP_URI" --db milocura --gzip --archive \
     | age -r "$AGE_PUBLIC_KEY" > milocura-$(date -u +%F).archive.gz.age
   aws s3 cp milocura-*.age s3://<bucket-privado-backups>/atlas/ --profile <usuario-solo-putobject>
   ```
   Corriendo en un GitHub Action programado (secrets: URI read-only, clave pública `age`, credenciales IAM que solo permitan `s3:PutObject` en ese prefijo) o en una máquina propia con `launchd`/cron.
3. Un bucket S3 con Block Public Access, cifrado SSE-S3 y lifecycle de 30 días: centavos por mes.
4. Probar el restore una vez por trimestre contra `milocura-staging`: `age -d … | mongorestore --gzip --archive --nsFrom 'milocura.*' --nsTo 'milocura-staging.*'`.

Otra opción es subir a M2/M10 si el negocio lo justifica (snapshots nativos).

## 6. Checklist de pasos MANUALES del usuario

Ninguna de estas cosas tiene CLI disponible acá (Atlas, Render, Cloudflare) o las tiene que decidir el dueño de la cuenta.

**Staging**
- [x] Atlas: base `milocura-staging` en el mismo cluster (creada 2026-10-19 al arrancar el servicio). Pendiente: usuario `milo-staging` con `readWrite` **solo** sobre `milocura-staging` (hoy staging usa `milo-care-dev`, que es `atlasAdmin`).
- [x] Render: el servicio `milo-care` (rama `develop`) es staging desde 2026-10-19.
- [x] `JWT_SECRET` propio en staging (2026-10-19, 96 caracteres; distinto del de prod).
- [ ] Opcional: separar también `RESEND_API_KEY`, `ANTHROPIC_API_KEY` y VAPID de staging (hoy los comparte con prod).
- [ ] Cuando staging responda, correr el `aws amplify update-branch … VITE_API_BASE_URL=…` de la sección 2 y redeployar `develop`.

**Cron externo**
- [ ] `openssl rand -hex 32` → `CRON_SECRET` en Render (`milo-care-production` → Environment) **y** en GitHub (Settings → Secrets and variables → Actions → `CRON_SECRET`), con el mismo valor.
- [ ] Mergear el PR del cron hasta `main` (los schedules solo corren desde la rama por defecto).

**DNS / email (Cloudflare)**
- [ ] Agregar los 2 CNAME de validación de ACM (DNS only). Si no, **la renovación del cert falla antes del 2027-01-10** (ver DNS-MIGRATION).
- [ ] Email → Email Routing → Enable. Reglas `hola@milocare.org` y `partners@milocare.org` → Gmail.
- [ ] DNS → TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:hola@milocare.org`.

**AWS**
- [ ] **Borrar la access key de root** desde la consola (cuenta root → Security credentials → Access keys → Deactivate → Delete), activar MFA en root si no lo tiene, y dejar el CLI solo con el perfil `milo-devops`:
  ```bash
  # tras borrar la key en la consola:
  aws configure --profile default   # o borrar el bloque [default] de ~/.aws/credentials
  export AWS_PROFILE=milo-devops
  ```
- [ ] CloudFront `E2YXF1X1VV5L` (deshabilitada, alias `milocare.org` vacío, origin `milocare.org`) **no se pudo borrar**: está suscrita a un *pricing plan* (flat-rate) de CloudFront. Consola → CloudFront → la distribución → cancelar el pricing plan, y después: `aws cloudfront get-distribution --id E2YXF1X1VV5L --query ETag` y `aws cloudfront delete-distribution --id E2YXF1X1VV5L --if-match <ETag>`. Después se puede borrar su Web ACL `CreatedByCloudFront-31e23e5e` (WAF, scope CLOUDFRONT).
- [ ] Opcional: borrar los roles IAM sobrantes de Elastic Beanstalk (`aws-elasticbeanstalk-ec2-role` + su instance profile, `aws-elasticbeanstalk-service-role`).

**Hecho (2026-10-19)**
- [x] Netlify: sitio `milocare` (`milocare.netlify.app`) borrado. Estaba conectado a `main` y sus builds fallaban desde junio, incluidos los deploy-previews de PRs.
- [x] AWS: app Elastic Beanstalk `milocare-backend` + bucket `elasticbeanstalk-us-east-1-013960777529`, cert ACM FAILED de EB, CloudFront `EBIRY53JL4HBO` y hosted zone Route 53 `milocare.org`, todos borrados. Backups de configuración fuera del repo.
- [x] IAM: usuario `milo-devops` (sin consola) + perfil CLI `milo-devops`.

## 7. Costos (FinOps)

Regla: toda acción con costo se avisa antes; lo recurrente necesita OK explícito. Precios de lista a la fecha: verificarlos en la página de cada proveedor antes de decidir.

### Gasto real (2026-10-19)

| Proveedor | Plan | Gasto | Fuente |
|---|---|---|---|
| AWS (Amplify + restos) | Pago por uso | **USD 0,51 en octubre**, forecast USD 0,55 | AWS Budgets (gratis de leer) |
| Render (`milo-care-production`) | Free | USD 0 | plan en `render.yaml` |
| MongoDB Atlas | M0 (free, según specs) | USD 0 | sin verificar (no hay acceso a Atlas) |
| Cloudflare (DNS, registrar) | Free + dominio al costo | dominio `.org` ~USD 10/año | estimación |
| Resend | Free (3.000 emails/mes, 100/día) | USD 0 | estimación |
| Anthropic (bot Milo, Haiku 4.5) | Pago por uso | variable: USD 1 / 5 por millón de tokens in/out | sin verificar el consumo real |
| GitHub Actions (cron) | Repo público: minutos gratis | USD 0 | |
| Paddle | % por venta (Merchant of Record) | solo si hay ventas | |

En octubre, ~USD 0,50 del gasto de AWS era la hosted zone de Route 53, ya borrada. Desde noviembre, AWS debería quedar en centavos (minutos de build y tráfico de Amplify).

### Guardas activas

- AWS Budgets: `My Monthly Cost Budget` (USD 10; alertas al 85 % y 100 % real y 100 % forecast) y `My Zero-Spend Budget` (USD 1).
- Pendiente: monitor de anomalías de Cost Explorer (gratis). Requiere `ce:*` de lectura para `milo-devops`, que hoy no tiene.

### Riesgos de costo conocidos

- **Horas de Render free:** las 750 h/mes son por workspace, y en `My Workspace` conviven `milo-care-production`, `milo-care` (staging) y `micuota-online-2026-backend`. El cron externo mantiene `milo-care-production` despierto (~744 h/mes), así que si `milo-care` también se mantiene despierto se pasa del límite y Render suspende los servicios. Staging tiene que quedar dormido: el cron solo pega a prod.
- **Bot Milo:** el costo crece con el tráfico de la landing; el rate limit de `/api/milo-chat` es la guarda. Revisar el consumo en console.anthropic.com y fijar un límite de gasto ahí.
- **Amplify `develop` con auto-build:** cada push consume minutos de build (USD 0,01/min). Hoy es despreciable.

### Decisiones con costo pendientes de OK

| Opción | Costo mensual | Estado |
|---|---|---|
| Render Starter (no duerme) | USD 7 | descartado: se usa el cron externo gratis |
| Atlas M0 para staging | USD 0 | recomendado |
| Atlas con backups gestionados (Flex/M10) | desde ~USD 8 / ~USD 57 | no recomendado aún; alternativa: `mongodump` a S3 (centavos) |
| Bucket S3 para backups de `mongodump` | < USD 0,10 | requiere OK |

## 8. Usuario IAM `milo-devops`

Sin acceso a consola. Políticas:
- Administradas: `CloudFrontReadOnlyAccess`, `AWSCertificateManagerReadOnly`, `AmazonRoute53ReadOnlyAccess`, `AmazonS3ReadOnlyAccess`, `AWSBillingReadOnlyAccess`, `AWSBudgetsReadOnlyAccess`.
- Inline `milo-care-amplify-manage`: `amplify:ListApps` sobre `*`, `amplify:*` solo sobre la app `d2d3bj1p216a32` y sus sub-recursos, y `Deny amplify:DeleteApp`.

No se usó `AdministratorAccess-Amplify` porque da IAM, CloudFormation, Lambda, etc. y excede lo que el proyecto necesita. Para borrar recursos fuera de Amplify (o tocar IAM) sigue haciendo falta una identidad admin, idealmente IAM Identity Center con MFA y no root.
