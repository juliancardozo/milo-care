# Milo Care — Modelo de Datos v1

> **Fuente de verdad del diseño de datos.** Base para los schemas Mongoose y el
> catálogo tipado de eventos. Mantener actualizado ante cada cambio de modelo.
>
> Estado: **aprobado** (v1). Decisiones registradas en
> [ADR-001](./adr/ADR-001-modelo-de-datos.md).
>
> Principio rector: **fricción mínima en la captura, profundidad ganada
> gradualmente (perfil progresivo).**

---

## 0. Principio arquitectónico: perfil progresivo

Toda captura de datos sigue esta regla: **el v1 de cualquier dato pide lo mínimo;
el detalle se gana después, en momentos de valor, de a un campo por vez, siempre
salteable.**

Implementación transversal:
- Cada perro tiene un `profileCompleteness` (0–100) calculado, visible como medidor
  cálido en el perfil ("Conocemos a Milo al 60% 🐾").
- Servicio `progressiveProfileService`: mantiene una cola priorizada de "próximo
  dato a pedir" por perro. Una sola pregunta de perfil por semana como máximo,
  insertada **tras** un check-in completado (nunca antes), siempre con botón
  "ahora no" sin penalidad.
- Prioridad de la cola: (1) fenotipo faltante en mestizos, (2) peso desactualizado
  >45 días, (3) fecha exacta de nacimiento si solo hay edad estimada, (4) datos de
  estilo de vida (castrado, alimentación, convivencia con otros perros).
- Regla dura: **ningún dato de perfil es bloqueante** excepto nombre, especie y
  edad aproximada en onboarding.

---

## 1. Colecciones principales (capa privada)

### `users`
`email`, `passwordHash`, `name`, `lang` (es/en), `premiumUntil`,
`notificationPrefs { checkinHour, channel }`, `zoneId` (opcional, opt-in),
`locationConsentAt`, `referralCode`, `createdAt`.

### `dogs`
- **Onboarding mínimo (obligatorio):** `name`, `ageEstimate`
  (cachorro/joven/adulto/senior o fecha exacta si la saben), `breedId`.
- `breedId` referencia al catálogo `breeds`, que **incluye "Mestizo" como entrada
  de primera clase**, no como "otro".
- `phenotype` (opcional, se completa gradualmente vía perfil progresivo):
  ```js
  phenotype: {
    size: 'mini'|'pequeño'|'mediano'|'grande'|'gigante',   // estimable por el tutor
    muzzle: 'chato'|'medio'|'largo',                        // braquicéfalo → reglas respiratorias
    coat: 'corto'|'medio'|'largo'|'doble',                  // reglas de calor/temporada
  }
  ```
- **Regla del motor de riesgo:** las reglas corren sobre `phenotype` resuelto. Para
  razas puras, el fenotipo se autocompleta desde el catálogo `breeds` (un Bulldog ya
  "sabe" que es chato). Para mestizos sin fenotipo cargado, el motor opera en modo
  conservador (solo reglas universales por edad) y el `progressiveProfileService`
  prioriza pedirlo con framing de valor: *"¿Milo es más bien chato de hocico? Nos
  ayuda a cuidarlo mejor en días de calor."*
- `photos[]`, `birthDate` (opcional), `neutered` (opcional), `createdAt`.

### `weights` (serie temporal, NO campo del perfil)
`{ dogId, value, unit, date, source: 'onboarding'|'checkin_suggestion'|'manual'|'vet_visit' }`
- **Cadencia: sugerida pero salteable.** El primer check-in de cada mes agrega una
  cuarta opción suave al flujo: *"¿De paso, lo pesaste hace poco? (opcional)"*.
  Saltearlo no afecta racha ni completitud de forma visible.
- El job nocturno calcula `weightTrend` por perro (pendiente sobre últimas 3–5
  pesadas) y alerta sobre pérdida >8% en 60 días o curva de crecimiento anómala en
  cachorros.

### `dailyCheckins`
`{ dogId, userId, date (único por perro/día), question, answer: 'bien'|'regular'|'mal', note?, channel: 'email'|'app', responseLatencyMs }`

### `symptoms`
- **Taxonomía v1: SIMPLE, 9 tipos cerrados** (decisión de diseño — fricción mínima):

  | slug | Label UI | Grupo de señal CTC |
  |---|---|---|
  | `vomito` | Vómito 🤢 | digestivo |
  | `diarrea` | Diarrea | digestivo |
  | `apetito` | No quiere comer | digestivo |
  | `letargo` | Decaído / sin energía | sistémico |
  | `tos_respiracion` | Tos o respiración rara | respiratorio |
  | `picazon_piel` | Picazón / piel / pelo | dermatológico |
  | `cojera_dolor` | Cojera o dolor | ortopédico |
  | `ojos_oidos` | Ojos u oídos | sensorial |
  | `otro` | Otra cosa | sin grupo (no agrega a CTC) |

- Campos: `{ dogId, type, severity: 'leve'|'media'|'fuerte', startedAt, resolvedAt?, note?, photoAttached: bool, entryMode: 'quick'|'full', subtype: null }`.
- **Evolución prevista (documentar, no implementar):** la taxonomía v2 agregará
  `subtype` opcional dentro de cada tipo cuando los datos muestren qué tipos
  concentran volumen. El evento ya reserva `subtype: null` para no romper agregados
  históricos.
- **Resolución:** si un síntoma lleva ≥24h sin `resolvedAt`, el siguiente check-in
  se reemplaza por el follow-up *"¿[Perro] sigue con [síntoma]?"* → Sí / Ya está
  mejor (setea `resolvedAt`). La **duración** (`resolvedAt - startedAt`) es el dato
  epidemiológico clave: separa malestar pasajero de señal de brote.

### `behaviorLogs`, `vaccines`, `medications`, `appointments`, `referrals`, `milestones`
Según master prompt. Agregar a `medications`:
`stoppedReason: 'terminado'|'olvido'|'efectos'|'costo'|'indicacion_vet'` — el abandono
de tratamiento con su razón es uno de los datos B2B más valiosos (1 de 4 tratamientos
se interrumpe; saber *por qué* y *dónde* no lo sabe nadie).

### `dogBaselines` (derivada, recalculada por job nocturno)
```js
{ dogId, category: 'comida'|'energia'|'agua'|'animo'|'digestion',
  window: 21, score: Number, sampleSize, updatedAt, provisional: bool }
```
- **Toda comparación es contra la línea base propia del perro**, nunca contra
  promedios genéricos: alertas ("3 días bajo SU normal"), tendencias, benchmarks CTC
  ("Milo está 20% bajo su normal — como el 60% de los perros de tu zona esta semana:
  probablemente el calor").
- Con `sampleSize < 10` la línea base se marca `provisional: true` y las alertas
  basadas en ella se suavizan (sugerencia, no alarma).

---

## 2. Catálogo de eventos v1 (append-only, payloads tipados, sin texto libre)

### `identity`
- `user.registered { ref? }`
- `dog.created { breedId, ageEstimate, hasBirthDate }`
- `dog.phenotype_completed { fields[] }`
- `location.optin { zoneLevel }`
- `location.optout {}`

### `care`
- `vaccine.logged { vaccineType, onSchedule: bool }`
- `vaccine.due { vaccineType }`
- `med.started { medClass }`
- `med.dose_taken {}`
- `med.stopped { reason }`
- `appointment.scheduled { source: 'manual'|'alert_cta' }`
- `appointment.completed {}`
- `appointment.missed {}`

### `signal`
- `checkin.sent { question, channel }`
- `checkin.answered { question, answer, channel, latencyMs }`
- `checkin.skipped {}`
- `symptom.logged { type, severity, entryMode }`
- `symptom.resolved { type, durationHours }`
- `weight.logged { source }` *(el valor vive en `weights`; el evento solo registra el hecho)*

### `bond`
- `behavior.logged { kind }`
- `milestone.reached { milestoneType }`
- `card.shared { template, format }`
- `card.downloaded { template }`

### `growth`
- `referral.shared { channel }`
- `referral.signup {}`
- `referral.activated {}`
- `surprise.shown { rewardType }`
- `surprise.claimed { rewardType }`
- `premium.started { source: 'referral'|'paid' }`
- `premium.expired {}`

### `outcome` (el loop que valida el motor de reglas)
- `alert.shown { ruleId, alertType }`
- `alert.actioned { ruleId, action: 'cita_agendada'|'descartada'|'ignorada' }`
- `visit.outcome { followUp: 'nada'|'tratamiento'|'serio' }` *(follow-up de 1 tap, 48h post-cita: "¿Era algo?")*

**Invariantes (con tests):** todo evento valida contra su schema del catálogo; los
payloads solo contienen enums, números y booleanos; `zoneId` se adjunta
automáticamente por el bus solo si el usuario tiene opt-in vigente; el borrado GDPR
elimina eventos por `userId`.

---

## 3. Catálogo de métricas agregadas (job nocturno, umbral K=20)

| Métrica | Dimensiones permitidas (público: máx. 2) | Audiencia |
|---|---|---|
| `signal.<grupo>.count` y `.avgDurationHours` | zona × período | Mapa sanitario CTC |
| `signal.<grupo>.vsBaseline` (% de perros bajo su línea base) | zona × período | Benchmarks "perros como el tuyo" |
| `census.dogs` | zona × (raza **o** tamaño **o** franja etaria) | Censo abierto CTC |
| `care.vaccineCoverage` (% al día) | zona × período | CTC + municipios |
| `care.medAdherence` y `med.stoppedReason` dist. | zona × medClass | Interna/B2B |
| `outcome.alertPrecision` (% de alerts→visita→'tratamiento/serio') | ruleId × período | Calibración interna del motor |
| `product.habitRate` (% usuarios con ≥5 check-ins/semana) | cohorte semanal | KPI norte |
| `product.viralFactor` (activados/usuario/mes) | zona, cohorte | Crecimiento |

Reglas aplicables (del master prompt): roll-up automático de zona hasta cumplir K,
`signalType: 'tutor_reported'` en toda métrica de salud, `otro` excluido de agregados
de señal.

---

## 4. Lo que deliberadamente NO se captura

Texto libre en eventos (vive solo en documentos privados) · coordenadas exactas
(geocoding en memoria, se descarta) · contenido/análisis de fotos (solo
`photoAttached`) · contactos del teléfono · datos del tutor más allá de email, idioma
y zona opt-in · respuestas de check-in con más de 3 niveles (la simplicidad del dato
es lo que lo hace comparable).

---

## 5. Decisiones tomadas (ver [ADR-001](./adr/ADR-001-modelo-de-datos.md))

1. **Taxonomía de síntomas: simple (9 tipos)** — prioriza captura sobre granularidad;
   `subtype` reservado para v2 guiada por volumen real.
2. **Pesada mensual: sugerida y salteable** — integrada al primer check-in del mes,
   sin culpa ni impacto en racha.
3. **Fenotipo en mestizos: opcional y gradual** — vía `progressiveProfileService`,
   con motor de riesgo en modo conservador hasta completarse.
4. **Línea base individual (21 días)** como referencia universal de comparación.
5. **Duración de síntomas** (`symptom.resolved`) como dato epidemiológico central de
   la CTC.
6. **Loop de outcome** (`visit.outcome`) para calibrar la precisión del motor de
   reglas.
