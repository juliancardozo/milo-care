# ADR-001 — Modelo de datos v1

- **Estado:** Aceptado
- **Fecha:** 2026-06-12
- **Contexto general:** Milo Care construye un activo de datos de salud canina cuyo
  valor depende de que la captura tenga fricción mínima y de que el dato resultante
  sea comparable a través de toda la población. Ver [data-model.md](../data-model.md).

Cada decisión sigue el formato Contexto → Decisión → Consecuencias.

---

## 1. Taxonomía de síntomas simple (9 tipos cerrados)

**Contexto.** Una taxonomía clínica rica (decenas de síntomas con subtipos) maximiza
granularidad pero mata la captura: el tutor no es veterinario y la fricción reduce el
volumen, que es lo que da valor epidemiológico.

**Decisión.** v1 usa 9 tipos cerrados (`vomito`, `diarrea`, `apetito`, `letargo`,
`tos_respiracion`, `picazon_piel`, `cojera_dolor`, `ojos_oidos`, `otro`). El evento
`symptom.logged` reserva `subtype: null` para una v2 guiada por el volumen real.

**Consecuencias.** (+) Captura de baja fricción y dato comparable desde el día 1.
(+) Migración a v2 sin romper agregados históricos. (−) Menor granularidad inicial;
`otro` no agrega a la CTC.

---

## 2. Pesada mensual sugerida y salteable

**Contexto.** El peso es una serie temporal de altísimo valor clínico (pérdida >8%,
curvas de crecimiento), pero pedirlo como obligación genera abandono.

**Decisión.** `weights` es una colección de serie temporal (no un campo del perfil).
El primer check-in de cada mes ofrece una cuarta opción suave "¿lo pesaste?"
(opcional). Saltearla no afecta racha ni completitud visible.

**Consecuencias.** (+) Historial de peso sin coerción. (+) El job nocturno deriva
`weightTrend` y alertas. (−) Cobertura de peso parcial; las alertas de peso se
suavizan con `sampleSize` bajo.

---

## 3. Fenotipo en mestizos: opcional y gradual

**Contexto.** El motor de riesgo necesita fenotipo (hocico, tamaño, manto). En razas
puras se autocompleta desde `breeds`; en mestizos no existe y exigirlo en onboarding
rompería el principio de fricción mínima.

**Decisión.** `phenotype` es opcional y se completa vía `progressiveProfileService`
(una pregunta/semana, post check-in, salteable). Sin fenotipo, el motor corre en
**modo conservador** (solo reglas universales por edad).

**Consecuencias.** (+) Onboarding mínimo. (+) El motor nunca da falsos negativos por
falta de dato (es conservador). (−) Cobertura de reglas fenotípicas creciente, no
inmediata, en mestizos.

---

## 4. Línea base individual (ventana 21 días) como referencia universal

**Contexto.** Comparar contra promedios genéricos produce alertas ruidosas: cada
perro tiene su normal.

**Decisión.** `dogBaselines` (derivada, recalculada nocturnamente) por categoría con
ventana de 21 días. **Toda** comparación (alertas, tendencias, benchmarks CTC) se
hace contra la línea base propia del perro. Con `sampleSize < 10` → `provisional`
y las alertas se suavizan.

**Consecuencias.** (+) Alertas específicas y de baja tasa de falsos positivos.
(+) Benchmarks honestos ("bajo SU normal"). (−) Requiere ~3 semanas de datos por
perro antes de ser plenamente útil.

---

## 5. Duración de síntomas como dato epidemiológico central

**Contexto.** Un conteo de síntomas no distingue malestar pasajero de brote. La
señal temprana de la CTC necesita duración.

**Decisión.** Los síntomas no resueltos en ≥24h disparan un follow-up en el check-in
que setea `resolvedAt`. El evento `symptom.resolved { durationHours }` es la métrica
clave; `signal.<grupo>.avgDurationHours` alimenta el mapa sanitario.

**Consecuencias.** (+) Separación brote vs. ruido. (+) Cierra el ciclo de vida del
síntoma con 1 tap. (−) Suma un paso condicional al check-in (acotado y salteable).

---

## 6. Loop de outcome para calibrar el motor de reglas

**Contexto.** Sin feedback, no se puede medir si una alerta del motor fue útil.

**Decisión.** Follow-up de 1 tap a 48h post-cita (`visit.outcome { followUp }`) y
`alert.actioned`. La métrica interna `outcome.alertPrecision` (alerts→visita→serio)
calibra cada `ruleId`.

**Consecuencias.** (+) El motor de reglas se vuelve medible y mejorable con datos
reales. (+) Base para priorizar/depurar reglas. (−) Depende de participación del
tutor en el follow-up (1 tap, opcional).
