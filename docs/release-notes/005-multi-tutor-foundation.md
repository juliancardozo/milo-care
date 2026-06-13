# Release 005 — Multi-tutor Foundation

## Resumen

Arquitectura base para acceso compartido a perfiles de perros entre múltiples tutores autenticados. En esta fase **no hay cambios de UX**; la feature queda cerrada detrás del flag `MULTI_TUTOR_ENABLED=false`.

## Archivos nuevos

| Archivo | Rol |
|---|---|
| `backend/src/models/DogAccess.js` | Colección de proyección de membresías |
| `backend/src/services/dogAccessPolicy.js` | Motor de autorización centralizado |
| `backend/src/services/dogMembershipService.js` | Ciclo de vida invite/accept/revoke |
| `backend/src/middleware/resolveDogAccess.js` | Middleware adaptador para rutas |
| `backend/src/routes/dogMembers.js` | Endpoints de gestión de miembros |
| `backend/scripts/backfillDogAccessOwners.js` | Backfill idempotente de filas owner |
| `backend/tests/unit/dogAccessPolicy.test.js` | Matriz completa de permisos |
| `backend/tests/contract/dog-members-contract.test.js` | Contratos HTTP de membresía |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/src/config/featureFlags.js` | `multiTutorEnabled` flag |
| `backend/src/app.js` | Mount de `/api/dogs/:dogId/members` |
| `backend/backend/.env.example` | Documentación de la variable |
| `render.yaml` | `MULTI_TUTOR_ENABLED=false` en producción |

## API Surface

Todos los endpoints requieren `MULTI_TUTOR_ENABLED=true` y autenticación JWT.

```
GET    /api/dogs/:dogId/members                # Listar miembros
POST   /api/dogs/:dogId/members/invite         # Invitar por email y rol
POST   /api/dogs/:dogId/members/accept         # Aceptar invitación con token
PATCH  /api/dogs/:dogId/members/:memberUserId  # Cambiar rol
DELETE /api/dogs/:dogId/members/:memberUserId  # Revocar acceso
```

## Roles y permisos

| Acción | owner | editor | viewer |
|---|:---:|:---:|:---:|
| dog.read | ✓ | ✓ | ✓ |
| dog.write | ✓ | ✓ | — |
| dog.share | ✓ | — | — |
| dog.revoke | ✓ | — | — |
| dog.delete | ✓ | — | — |

## Rollout

1. Ejecutar backfill en dry-run: `node scripts/backfillDogAccessOwners.js`
2. Verificar output (0 errores esperados).
3. Ejecutar con `--write`.
4. Setear `MULTI_TUTOR_ENABLED=true` en Render.
5. Redeploy.

## Rollback

Setear `MULTI_TUTOR_ENABLED=false` y redeploy. Los datos de `DogAccess` permanecen inertes.
