# Migración DNS → milocare.org

Guía paso a paso para publicar Milo Care en `milocare.org` con CloudFront + Cloudflare + Resend + Render.

**Tiempo estimado:** 30–60 min (más tiempo de propagación DNS).  
**Riesgo de downtime:** mínimo si seguís el orden exacto de esta guía.

---

## Resumen del stack

| Capa | Servicio | URL final |
|---|---|---|
| Frontend (SPA) | AWS Amplify → CloudFront | `https://milocare.org` y `https://www.milocare.org` |
| Backend (API) | Render | `https://api.milocare.org` *(o la URL que Render asigne)* |
| Email transaccional | Resend | `noreply@milocare.org` |
| DNS | Cloudflare | autoritativo para `milocare.org` |
| Certificado TLS | AWS ACM (us-east-1) | wildcard `*.milocare.org` + apex `milocare.org` |

---

## PASO 1 — Certificado ACM (región us-east-1)

> CloudFront **solo acepta** certificados de ACM en `us-east-1`. Si lo creás en otra región no aparece en la lista de CloudFront.

1. Ir a **AWS Console → Certificate Manager → cambiar región a `us-east-1`**.
2. Clic en **Request certificate** → *Request a public certificate*.
3. En "Fully qualified domain names" agregar **dos entradas**:
   ```
   milocare.org
   *.milocare.org
   ```
4. Método de validación: **DNS validation** (recomendado).
5. Clic en **Request**.
6. Abrí el certificado recién creado → expandí cada dominio → copiá los dos registros CNAME que ACM genera:

   | Nombre | Tipo | Valor |
   |---|---|---|
   | `_abc123.milocare.org` | CNAME | `_xyz789.acm-validations.aws.` |
   | `_abc123.www.milocare.org` | CNAME | `_xyz789.acm-validations.aws.` |

   *(Los valores reales los genera AWS, estos son ejemplos de formato.)*

7. Ir a **Cloudflare → milocare.org → DNS** y agregar esos dos registros CNAME con **nube gris (DNS only)**.
8. Volver a ACM y esperar hasta que el estado diga **Issued** (tarda 2–10 min).

> No avances al Paso 2 hasta ver **Issued**.

---

## PASO 2 — CloudFront: agregar dominio alternativo

1. Ir a **AWS Console → CloudFront → tu distribución** (la que sirve el frontend de Amplify/S3).
2. Clic en **Edit** en la sección *General → Settings*.
3. En **Alternate domain names (CNAMEs)** agregar:
   ```
   milocare.org
   www.milocare.org
   ```
4. En **Custom SSL certificate** seleccionar el certificado ACM creado en el Paso 1.
5. **Save changes**.
6. Esperar que el estado de la distribución vuelva a **Deployed** (2–5 min).
7. Copiar el **Distribution domain name**, tiene formato:
   ```
   d1234abcd5678.cloudfront.net
   ```
   Lo necesitás en el Paso 3.

---

## PASO 3 — Cloudflare DNS: apuntar el sitio web a CloudFront

En **Cloudflare → milocare.org → DNS → Add record**:

| Tipo | Nombre | Destino | Proxy |
|---|---|---|---|
| CNAME | `@` (apex) | `d1234abcd5678.cloudfront.net` | **DNS only** (nube gris) |
| CNAME | `www` | `d1234abcd5678.cloudfront.net` | **DNS only** (nube gris) |

> Usá **DNS only** porque CloudFront ya maneja TLS y tiene su propia red CDN. Proxear (nube naranja) puede causar problemas de certificado con CloudFront.

**Verificar:**
```bash
curl -I https://milocare.org
# Debe responder HTTP/2 200 con header x-cache: Hit from cloudfront (o Miss en primer hit)
```

---

## PASO 4 — Resend: verificar dominio para email

1. Ir a **resend.com → Domains → Add Domain**.
2. Escribir `milocare.org` → clic **Add**.
3. Resend mostrará registros DNS para verificar. Agregalos todos en Cloudflare con **DNS only**:

### DKIM (2 registros TXT o CNAME, según Resend)
| Tipo | Nombre | Valor |
|---|---|---|
| TXT o CNAME | `resend._domainkey` | *(valor que da Resend)* |

### MX (para recibir bounces)
| Tipo | Nombre | Prioridad | Valor |
|---|---|---|---|
| MX | `@` o `send` | 10 | `feedback-smtp.us-east-1.amazonses.com` |

### SPF
| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `@` | `v=spf1 include:amazonses.com ~all` |

> Si ya tenés un registro SPF en `@` para otro servicio, **no agregues uno nuevo** — concatená los `include:` en el mismo registro TXT.

4. Una vez agregados, volver a Resend → clic **Verify** → esperar estado **Verified** (puede tardar hasta 30 min).
5. En Render (dashboard del backend), actualizar:
   ```
   RESEND_FROM_EMAIL=noreply@milocare.org
   ```

---

## PASO 5 — Email routing (hola@ y partners@)

Con Cloudflare Email Routing (gratis):

1. Ir a **Cloudflare → milocare.org → Email → Email Routing → Enable Email Routing**.
2. Cloudflare pedirá agregar registros MX. Acepar y agregar automáticamente.
3. Ir a **Routing Rules → Custom addresses → Add address**:
   - `hola@milocare.org` → tu Gmail
   - `partners@milocare.org` → tu Gmail (o un alias distinto)

> **Conflicto MX posible:** Resend y Cloudflare Email Routing usan registros MX distintos.  
> Solución: Resend usa un subdominio para envío (`send.milocare.org`) y los MX del apex quedan para Cloudflare Email Routing.  
> En el paso 4, cuando Resend pida el MX, configurarlo en `send` en lugar de `@`.

---

## PASO 6 — Render: actualizar variables de entorno

En **render.com → milocura-backend → Environment**:

| Variable | Valor |
|---|---|
| `APP_URL` | `https://milocare.org` |
| `VET_SHARE_PUBLIC_BASE_URL` | `https://milocare.org` |
| `WALLET_PUBLIC_BASE_URL` | `https://milocare.org` |
| `RESEND_FROM_EMAIL` | `noreply@milocare.org` |
| `VAPID_SUBJECT` | `mailto:hola@milocare.org` |

> El `render.yaml` del repo ya tiene estos valores actualizados. Si sincronizás el servicio desde el repo, se aplican solos. Si los tenés manuales en el dashboard, actualizalos a mano.

Después de guardar, Render reinicia el servicio automáticamente.

---

## PASO 7 — Amplify: dominio personalizado (si el frontend está en Amplify)

> Este paso conecta Amplify con tu dominio en Cloudflare.

1. Ir a **AWS Amplify → tu app → App settings → Domain management → Add domain**.
2. Escribir `milocare.org`.
3. Amplify mostrará registros DNS para verificar. Pueden ser:
   - Un CNAME para verificación del dominio
   - Registros para `www` y `@`
4. Agregalos en Cloudflare con **DNS only**.
5. Amplify despliega el certificado automáticamente (usa ACM internamente).

> **Nota:** Si ya servís el frontend desde CloudFront directamente (S3 + CloudFront, sin Amplify hosting), saltate este paso. El Paso 2 ya lo cubre.

---

## PASO 8 — Verificación final

```bash
# Certificado válido
curl -vI https://milocare.org 2>&1 | grep -E "SSL|subject|expire|HTTP/"

# www redirige al apex (o responde igual)
curl -I https://www.milocare.org

# API responde
curl https://api.milocare.org/api/health   # ajustá el endpoint según tu backend

# Email: enviá un test desde el dashboard de Resend
```

Checklist:
- [ ] `https://milocare.org` carga la app (CloudFront → Amplify/S3)
- [ ] `https://www.milocare.org` carga o redirige al apex
- [ ] Certificado TLS válido (candado verde, no warning)
- [ ] Email de bienvenida llega con remitente `noreply@milocare.org`
- [ ] `hola@milocare.org` llega a Gmail
- [ ] Backend responde en su URL de Render con `APP_URL` actualizado

---

## Orden recomendado para evitar downtime

```
1. ACM → Issued          (sin impacto, solo DNS)
2. CloudFront update     (sin impacto en dominio viejo)
3. Cloudflare DNS        (este es el corte — después de este paso el tráfico va al nuevo destino)
4. Resend verify         (paralelo, sin impacto en web)
5. Cloudflare Email      (paralelo)
6. Render env vars       (reinicio del backend ~30s)
```

Si necesitás rollback rápido: eliminá los registros CNAME `@` y `www` de Cloudflare y apuntá de nuevo al dominio anterior.
