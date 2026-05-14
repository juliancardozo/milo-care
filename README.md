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