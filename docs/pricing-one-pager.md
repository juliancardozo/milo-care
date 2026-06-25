# Milo Care — Pricing one-pager (AR/UY)

> Hipótesis de lanzamiento para validar, ancladas al modelo ya implementado.
> **Ancla en USD**; en AR se cobra indexado a USD y se re-precia mensual (inflación).

**Supuestos FX (ilustrativos, actualizar):** 1 USD ≈ **40 UYU** ≈ **1.200 ARS**.

---

## Lane 1 — B2C Premium (suscripción por tutor)

| Plan | Incluye | USD/mes | UYU/mes | ARS/mes |
|---|---|---|---|---|
| Free | 1 perro, recordatorios, carnet básico | 0 | 0 | 0 |
| **Premium** | Perros ilimitados, export PDF, WhatsApp, IA síntomas, alertas avanzadas, multi-tutor | **$3,49** | 140 | 4.200 |
| Premium anual | Premium ~30% off | $29/año | 1.160 | 34.800 |

- Gating ya implementado (`EntitlementService`). North Star: conversión Free→Premium (**3–6%**).

---

## Lane 2 — B2B2C Partner (aseguradora / fintech / banco)

**Modelo:** `setupFee` (una vez) + `pricePerActivePet`/mes (unidad ya en código: `isPetActive` → `BillingRecord`).

| Mascotas activas/mes | USD por activa |
|---|---|
| 0 – 1.000 | $1,20 |
| 1.000 – 5.000 | $0,90 |
| 5.000+ | $0,60 |

| Setup fee | USD |
|---|---|
| Piloto (≤90 días) | $1.500 (o bonificado) |
| Producción | $3.500 – $5.000 |

**Add-ons:**
| Add-on | Precio | Asset |
|---|---|---|
| Certificación | $0,50 / mascota certificada/mes | `PetScoreCertificate` + consentimiento |
| Lead calificado (CPL) | $10 / lead | `InsuranceLead` + webhook |
| Póliza convertida (CPA) | $40 / póliza | `InsuranceLead.convert` + metering |
| Claims facilitation | $3–5 / borrador | `ClaimsService` |

---

## Lane 3 — Vet (Kit de Activación)

| Plan clínica | USD/mes | Incluye |
|---|---|---|
| Starter | 0 | Panel + QR + atribución (funnel) |
| Pro | $24 | + certificación, expediente branded, multi-vet |
| Per-cert (alt.) | $1,50 / certificación | Bajo volumen |

CAC vía vet ≈ 1 mes Premium subsidiado × tasa de activación.

---

## Lane 4 — Distribución embebida (futuro)

| Modelo | Comisión |
|---|---|
| Seguro vendido in-app (el partner asegura) | 10–20% prima 1er año |

---

## Unit economics (ilustrativo)

| Métrica | Valor |
|---|---|
| ARPU Premium B2C | ~$3,5/mes |
| Contribución por mascota activa | ~$0,90 bruto · ~$0,80 margen |
| CAC vía vet | ~$1–2 |

**Ejemplo — Partner 5.000 aseguradas, 70% activas (3.500):**
```
Base:           3.500 × $0,90   = $3.150/mes
Certificación:  1.500 × $0,50   =   $750/mes
Lead-gen (CPA): 50 pólizas × $40 = $2.000/mes
──────────────────────────────────────────────
MRR ≈ $5.900/mes  + setup $3.500 (una vez)
```

## Palancas a medir
1. Conversión Free→Premium (B2C).
2. Tasa de mascota activa por partner.
3. Lead→póliza (CPA) — mayor ROI.
4. Certificaciones emitidas (vet).

## Riesgos
- AR/inflación → anclar a USD + re-precio mensual; anual con descuento.
- Active rate baja → ingreso partner cae (lo sostiene el "mes gratis" del vet + sponsorship).
- No vender dato clínico individual (solo agregados/consentido).
