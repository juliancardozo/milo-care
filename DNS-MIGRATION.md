# DNS de milocare.org: estado actual

> La migración ya está hecha. Este archivo antes era una guía paso a paso y tenía supuestos que no se cumplieron (`api.milocare.org`, cert wildcard, Route 53). Ahora documenta **cómo quedó**, verificado el 2026-10-19, y lo que falta.
> El runbook completo de ambientes está en [`docs/devops/ENVIRONMENTS.md`](docs/devops/ENVIRONMENTS.md).

## Resumen

| Capa | Servicio | Detalle |
|---|---|---|
| Registrar + DNS autoritativo | Cloudflare (`dale` / `kami.ns.cloudflare.com`) | Registro vence 2027-06-26 |
| Frontend (SPA) | AWS Amplify app `milo-care-production` (`d2d3bj1p216a32`) | `milocare.org` y `www` → CloudFront de Amplify `d1ba73r7qgijai.cloudfront.net` (DNS only, nube gris) |
| Certificado TLS | ACM us-east-1, **custom cert** de la app Amplify | `milocare.org` + `www.milocare.org` (no wildcard). Vence 2027-01-10 |
| API | Proxy de Amplify (custom rule a nivel app) | `https://milocare.org/api/*` → `https://milo-care-production.onrender.com/api/*` |
| Email saliente | Resend (dominio `milocare.org`) | DKIM `resend._domainkey`, return-path `send.milocare.org` (MX + SPF a SES sa-east-1) |
| Email entrante | **Pendiente** | No hay MX en el apex: `hola@` y `partners@` rebotan |

### `api.milocare.org` no existe y no hace falta

El frontend llama a `/api/...` en el mismo origen y Amplify lo reenvía a Render. Así no hay CORS en producción, no se necesita un registro DNS extra y no hay que sacar otro certificado. Si algún día se necesita un subdominio para la API pública (p. ej. partners `/api/v1`), se agrega un CNAME `api` → `milo-care-production.onrender.com` y un custom domain en Render. Hoy no hay motivo.

### Route 53: eliminado

La hosted zone `milocare.org` de Route 53 no estaba delegada (el autoritativo es Cloudflare) y costaba USD 0,50/mes. Se borró el 2026-10-19 y el backup de sus registros quedó fuera del repo. **Todo cambio de DNS se hace en Cloudflare.**

### Netlify: eliminado

El sitio `milocare.netlify.app` (build viejo, conectado a `main`, con builds fallando desde junio) se borró el 2026-10-19. La URL ahora responde 404.

## Pendientes

### 1. Validación del certificado ACM (antes de diciembre 2026)

El cert custom de Amplify (`ed2d22fd-…`, vence **2027-01-10**) renueva solo si los CNAME de validación existen en el DNS. **Hoy no están en Cloudflare.** Hay que agregarlos con **DNS only**:

| Tipo | Nombre | Destino |
|---|---|---|
| CNAME | `_1b598383de62fc1aa0b1f350d4e19455` | `_a7578892ed833e5d971defb7aca81c2e.jkddzztszm.acm-validations.aws.` |
| CNAME | `_f535fe24d35619a136e905ab3bbe38b6.www` | `_542023e6d34eb965e16a40c3b136ce6e.jkddzztszm.acm-validations.aws.` |

Para comprobarlo: `aws acm describe-certificate --certificate-arn arn:aws:acm:us-east-1:013960777529:certificate/ed2d22fd-ebb4-4913-80bf-415a06e0d900 --query Certificate.DomainValidationOptions`. La alternativa es pasar el dominio a un certificado gestionado por Amplify (`AMPLIFY_MANAGED`).

### 2. Email entrante (`hola@`, `partners@`)

Cloudflare → milocare.org → **Email → Email Routing → Enable**. Aceptá los MX y el SPF que propone para el **apex**; no tocan `send.milocare.org`, que es de Resend. Después, en **Routing rules → Custom addresses**:
- `hola@milocare.org` → Gmail
- `partners@milocare.org` → Gmail

> Si Cloudflare agrega un TXT SPF en el apex (`v=spf1 include:_spf.mx.cloudflare.net ~all`), dejalo así. Resend usa su propio SPF en `send`.

### 3. DMARC

Cloudflare → DNS → Add record:

| Tipo | Nombre | Contenido |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hola@milocare.org` |

Cargalo después del paso 2, así los reportes `rua` llegan. Con un par de semanas de reportes limpios, subí a `p=quarantine`.

## Verificación rápida

```bash
dig +short NS milocare.org                       # dale/kami.ns.cloudflare.com
dig +short A milocare.org                        # IPs de CloudFront
curl -sI https://milocare.org | head -1          # HTTP/2 200
curl -s -o /dev/null -w '%{http_code}\n' https://milocare.org/api/openapi.yaml   # 200 (despierta Render)
dig +short MX milocare.org                       # vacío hasta hacer el paso 2
dig +short TXT _dmarc.milocare.org               # vacío hasta hacer el paso 3
```
