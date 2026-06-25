# Milo Care

Plataforma web para gestionar la salud de perros con enfoque en recordatorios, historial clinico y seguimiento diario.

Milo Care permite a una persona tutora registrar vacunas, medicamentos, citas veterinarias y sintomas en un solo lugar, con notificaciones por correo y panel centralizado.

## Tabla de contenido

- [Vision del producto](#vision-del-producto)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnologico](#stack-tecnologico)
- [Arquitectura](#arquitectura)
- [Inicio rapido con Docker (recomendado)](#inicio-rapido-con-docker-recomendado)
- [Desarrollo local sin Docker](#desarrollo-local-sin-docker)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [API principal](#api-principal)
- [Roles y administracion](#roles-y-administracion)
- [Flujo funcional esperado](#flujo-funcional-esperado)
- [Estado del proyecto](#estado-del-proyecto)
- [Contribucion](#contribucion)

## Vision del producto

Milo Care nace para resolver un problema comun: la informacion de salud de las mascotas suele estar fragmentada entre chats, notas y memoria.

El MVP centraliza:

- Perfil de usuario y perros
- Historial de vacunas, medicamentos, citas y sintomas
- Recordatorios por correo
- Vista de dashboard para acceso rapido
- Modelo freemium (1 perro en plan free, ilimitado en premium)

## Funcionalidades principales

- Autenticacion segura con JWT y hash de contrasena con `bcryptjs`
- Registro/login, recuperacion de contrasena y borrado total de cuenta (GDPR)
- Gestion de perfiles de perros
- Modulo de vacunas con recordatorios por vencimiento
- Modulo de medicamentos con frecuencia y estado
- Modulo de citas veterinarias con recordatorios anticipados
- Modulo de sintomas con registro cronologico
- Historial completo de salud por perro
- Preferencias de notificacion
- UI bilingue (Espanol prioritario, Ingles opcional) con selector por banderas en header

## Stack tecnologico

### Backend

- Node.js 20
- Express 4
- MongoDB + Mongoose 8
- JWT (`jsonwebtoken`)
- Email con Resend
- Jobs programados con `node-cron`

### Frontend

- React 18
- Vite 5
- React Router 6
- Redux Toolkit
- Axios

### Infraestructura

- Docker Compose
- MongoDB 7.0 (contenedor)

## Arquitectura

Aplicacion de arquitectura modular tipo monolito (backend API + frontend SPA + MongoDB).

- `backend/`: API REST, modelos, middleware, servicios (email y recordatorios)
- `frontend/`: SPA, routing protegido, estado global y vistas funcionales
- `docker-compose.yml`: orquestacion de `mongo`, `backend`, `frontend`

## Inicio rapido con Docker (recomendado)

### 1. Clonar el repositorio

```bash
git clone https://github.com/juliancardozo/milo-care.git
cd milo-care
```

### 2. Configurar entorno de backend

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` y verifica al menos:

- `JWT_SECRET` con un valor robusto
- `RESEND_API_KEY` con tu API key real
- `RESEND_FROM_EMAIL` con remitente autorizado
- `APP_URL=http://localhost:5173`

Para correr con Mongo en Docker, usa:

```env
MONGODB_URI=mongodb://mongo:27017/milocura
```

### 3. Levantar servicios

```bash
docker compose up
```

Servicios:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- MongoDB: mongodb://localhost:27017

Para detener:

```bash
docker compose down
```

## Desarrollo local sin Docker

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Frontend (nueva terminal)

```bash
cd frontend
npm install
npm run dev
```

Abre: http://localhost:5173

## Variables de entorno

Archivo: `backend/.env`

| Variable | Requerida | Ejemplo | Descripcion |
|---|---|---|---|
| `PORT` | Si | `3001` | Puerto del backend |
| `NODE_ENV` | Si | `development` | Entorno de ejecucion |
| `MONGODB_URI` | Si | `mongodb://mongo:27017/milocura` | Conexion MongoDB |
| `JWT_SECRET` | Si | `...` | Secreto para firmar tokens |
| `JWT_EXPIRES_IN` | Si | `7d` | Duracion del JWT |
| `RESEND_API_KEY` | Si | `re_xxx` | API key de Resend |
| `RESEND_FROM_EMAIL` | Si | `noreply@dominio.com` | Remitente de emails |
| `APP_URL` | Si | `http://localhost:5173` | URL publica de frontend |

## Scripts disponibles

### Backend (`backend/package.json`)

| Script | Comando | Uso |
|---|---|---|
| `start` | `node src/server.js` | Produccion/local simple |
| `dev` | `nodemon src/server.js` | Desarrollo |
| `test` | `jest --runInBand` | Pruebas backend |
| `test:watch` | `jest --watch` | Pruebas en modo watch |

### Frontend (`frontend/package.json`)

| Script | Comando | Uso |
|---|---|---|
| `dev` | `vite` | Desarrollo |
| `build` | `vite build` | Build de produccion |
| `preview` | `vite preview` | Preview del build |
| `test` | `vitest` | Pruebas frontend |
| `test:ui` | `vitest --ui` | UI runner de pruebas |
| `lint` | `eslint src --ext .js,.jsx` | Linter |

## API principal

Base URL local:

- `http://localhost:3001/api`

Rutas relevantes:

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `POST /auth/logout`
  - `PATCH /auth/me/notifications`
  - `DELETE /auth/me`
- Dogs:
  - `GET /dogs`
  - `POST /dogs`
  - `GET /dogs/:dogId`
  - `PATCH /dogs/:dogId`
  - `DELETE /dogs/:dogId`
- Salud por perro:
  - `.../vaccinations`
  - `.../medications`
  - `.../appointments`
  - `.../symptoms`

## Roles y administracion

### Roles disponibles

| Rol | Descripcion |
|---|---|
| `user` | Rol por defecto. Acceso a su propia cuenta, perros y registros de salud. |
| `admin` | Acceso al panel de administracion en `/admin`. Puede gestionar todos los usuarios de la plataforma. |

El rol se incluye en el JWT y se valida en cada request al backend. Las rutas `/api/admin/*` requieren `role: admin`; cualquier otro usuario recibe `403 Forbidden`.

### Panel de administracion

Accesible en `http://localhost:5173/admin` para usuarios con rol `admin`.

Funcionalidades:

- **Stats generales**: total de usuarios, distribucion por plan (free/premium), total de perros registrados.
- **Gestion de usuarios**: busqueda por nombre o email, cambio de plan y rol en linea, paginacion.
- **Detalle de usuario**: edicion de nombre, plan y rol; listado de perros con contadores de vacunas, citas y medicamentos; eliminacion de cuenta.

El link al panel aparece automaticamente en el menu de usuario (header) cuando el rol es `admin`.

### Cuenta administradora activa

| Campo | Valor |
|---|---|
| Email | `julian.cardozo.viggiano@gmail.com` |
| Rol | `admin` |

### Promover un nuevo administrador

Con Docker Compose corriendo:

```bash
docker exec milocura-mongo mongosh milocura \
  --eval 'db.users.updateOne({email:"usuario@ejemplo.com"},{$set:{role:"admin"}})'
```

Despues de ejecutar el comando, el usuario debe cerrar sesion y volver a iniciarla para que el nuevo JWT refleje el rol actualizado.

### Revocar rol de administrador

```bash
docker exec milocura-mongo mongosh milocura \
  --eval 'db.users.updateOne({email:"usuario@ejemplo.com"},{$set:{role:"user"}})'
```

## Flujo funcional esperado

1. Registrar cuenta
2. Crear primer perfil de perro
3. Ver dashboard
4. Registrar vacuna, medicamento, cita o sintoma
5. Revisar historial completo
6. Recibir recordatorios por correo segun configuracion

## Companion (B2B2C) — Fase 1

Capa **white-label / multi-tenant** que monta Milo Care sobre la marca de un partner
(aseguradora, fintech, banco, veterinaria). **Es aditiva**: todo usuario o perro sin
`partnerId` funciona exactamente igual que el producto B2C actual.

### Feature flag

```bash
# backend/.env
COMPANION_ENABLED=true   # default false: oculta (404) las rutas de partners
```

Las rutas de export PDF / compartir WhatsApp **no** dependen del flag (son premium B2C).

### Modelo de datos (aditivo, nullable)

- **`Partner`** — `name`, `slug` (white-label), `type` (`insurer|fintech|bank|vet`),
  `branding` (`logoUrl`, `primaryColor`, `secondaryColor`, `appName`), `contract`
  (`setupFee`, `pricePerActivePet`, `currency`, `billingDay`), `features[]`,
  `apiKeyHash`, `webhookUrl`, `status`.
- **`User`** (+): `partnerId` (nullable), rol `partner_admin`.
- **`User.dogs[]`** (+): `partnerId` (nullable), `sponsorshipStatus` (`none|sponsored`).
- **`Clinic`** (+): `partnerId` (nullable) — la clínica del Kit Veterinario opcionalmente
  se vincula a un Partner; sigue funcionando igual.

Migración idempotente (backfill de defaults nullable, no toca otros datos):

```bash
cd backend && node scripts/migrations/001-partner-fields.js
```

### EntitlementService

Única fuente de verdad de qué features están habilitadas para un `(user, dog)`. Una
feature se desbloquea por **premium personal** (`User.isPremiumActive()`) **O** por
**patrocinio del partner** (`dog.sponsorshipStatus === 'sponsored'`). Las features de
alcance usuario (ej. `unlimitedDogs`) solo las habilita el premium.

### Endpoints nuevos

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/partners` | admin | Crea partner; devuelve la API key en claro **una vez** |
| `GET` | `/api/partners/:id` | admin | Detalle del partner (sin hash de API key) |
| `GET` | `/api/public/partners/by-slug/:slug/theme` | público | Branding white-label por slug |
| `GET` | `/api/dogs/:dogId/export.pdf` | tutor/co-tutor | Carnet PDF (gated: premium o patrocinio) |
| `POST` | `/api/dogs/:dogId/share/whatsapp` | tutor/co-tutor | `{ text, link }` para compartir (gated) |

Sin entitlement, las rutas de export/share responden `403 UPGRADE_REQUIRED`.

### White-label en el frontend

`ThemeProvider` resuelve el partner por **subdominio** (`acme.milocare.online`) o por
**`?partner=<slug>`** (dev/QA), pide el branding a `/public/partners/by-slug/:slug/theme`
y aplica las CSS variables (`--color-primary`, etc.) + nombre de app. Sin partner →
branding Milo Care default.

```bash
# probar theming en dev sin DNS:
http://localhost:5173/?partner=acme
```

## Monetización B2B2C — "mascota activa" (Fase 2, en curso)

La unidad de facturación y North Star: `isPetActive(pet, month)` (`services/petActivity.js`),
función **pura y testeable**. Un perro es activo en un mes calendario (UTC) si tuvo ≥1
evento de salud (vacuna, desparasitación, medicación, cita, síntoma, consulta) o una
atestación cumplida en ese mes.

- **Metering mensual** (`MeteringService` + `MeteringJob`): job diario 03:00 que, en el
  `billingDay` de cada partner activo, upsertea `UsageRecord` por perro y genera el
  `BillingRecord` del mes anterior = **setupFee (una vez) + activePets × pricePerActivePet**.
- `GET /api/partners/:id/billing?month=YYYY-MM` (admin) → la factura del mes.
- **Checkout B2C con Mercado Pago**: `POST /api/billing/checkout` (devuelve `checkoutUrl`)
  y `POST /api/billing/webhook` (pago aprobado → otorga Premium, idempotente por payment id).
  Sin `MERCADOPAGO_ACCESS_TOKEN`, el checkout responde 503 y el front cae al interés manual.

## Companion de seguro (Fase 3)

Todo detrás de `COMPANION_ENABLED`. **Guardrails**: el coverage-check y el Claims Assistant
son **informativos, nunca vinculantes** (disclaimer siempre presente, deciden vet/aseguradora).

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST`/`GET` | `/api/dogs/:dogId/policy` | Vincula / consulta la póliza (`coverage` estructurada) |
| `GET` | `/api/dogs/:dogId/policy/coverage-check?event=<tipo>` | "¿Lo cubre?" orientativo + disclaimer + carencia |
| `POST`/`GET` | `/api/dogs/:dogId/claims` | Claims Assistant v0: borrador desde el historial |
| `GET` | `/api/claims/:id` | Detalle del reclamo (autorizado por acceso al perro) |
| `POST` | `/api/dogs/:dogId/insurance-lead` | "¿Necesito un seguro?" → crea lead + **webhook al partner** (reintentos + registro) |

Frontend: pantalla **Mi seguro** en `/dogs/:dogId/seguro` (póliza, coverage-check, borrador
de reclamo, CTA de lead) + botón de checkout Mercado Pago en `/upgrade`.

### Certificación veterinaria desde el panel

Además del link de expediente, el vet logueado certifica carnets de **su** cohorte:

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/vet-portal/patients` | vet | Pacientes de la clínica con ítems atestables |
| `POST` | `/api/vet-portal/dogs/:dogId/attest` | vet | Certifica una vacuna/desparasitación (aislado por cohorte; otra clínica → 403) |

Ver [docs/petscore-certification.md](docs/petscore-certification.md) para el diseño del sello.

## Estado del proyecto

- MVP funcional implementado
- Dashboard bilingue (ES/EN) con switch de idioma
- Onboarding de perros con calendario vacunal (AR/UY) basado en normativa SENASA y guias WSAVA
- Catalogo de vacunas y citas con clasificacion clinica
- Panel de administracion con gestion de usuarios y roles
- Cuenta admin activa: `julian.cardozo.viggiano@gmail.com`

## Contribucion

Sugerencias para colaborar:

1. Crear rama feature desde `develop`
2. Mantener cambios atomicos y descriptivos
3. Validar `npm test` en backend/frontend
4. Abrir Pull Request con contexto funcional y tecnico

---

Si quieres, puedo generar tambien una version corta en ingles (`README.en.md`) para audiencias tecnicas internacionales.