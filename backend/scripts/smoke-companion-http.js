'use strict';

/**
 * Smoke test HTTP de la capa Companion contra un server CORRIENDO (no usa la DB
 * directamente: todo por HTTP). Resuelve los ids solos. Requiere haber corrido
 * antes el seed de demo y tener el server levantado con COMPANION_ENABLED=true.
 *
 *   # terminal 1
 *   COMPANION_ENABLED=true node src/server.js
 *   # terminal 2
 *   node scripts/seed-companion-demo.js
 *   node scripts/smoke-companion-http.js
 *
 * Variables: BASE (default http://localhost:3001), API_KEY (default demo).
 */

const BASE = process.env.BASE || 'http://localhost:3001';
const KEY = process.env.API_KEY || 'mp_demo_companion_key_0001';
const PASS = 'demo1234';

async function call(method, path, { token, apiKey, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* noop */ }
  return { status: res.status, data };
}

const mark = (cond) => (cond ? '✅' : '❌');
let fails = 0;
function check(label, cond, detail = '') {
  if (!cond) fails += 1;
  console.log(`${mark(cond)} ${label}${detail ? `  ${detail}` : ''}`);
}

async function main() {
  // Logins
  const tutor = await call('POST', '/api/auth/login', { body: { email: 'ana@companion-demo.test', password: PASS } });
  const pa = await call('POST', '/api/auth/login', { body: { email: 'partner-admin@companion-demo.test', password: PASS } });
  check('login tutor', tutor.status === 200);
  check('login partner_admin (con partnerId)', pa.status === 200 && !!pa.data?.user?.partnerId, `partnerId=${pa.data?.user?.partnerId}`);
  const tToken = tutor.data?.token;
  const paToken = pa.data?.token;
  const pid = pa.data?.user?.partnerId;

  // dogId de Luna vía la API del tutor
  const dogs = await call('GET', '/api/dogs', { token: tToken });
  const luna = dogs.data?.dogs?.find((d) => d.name === 'Luna')?.id;
  check('GET /api/dogs (Luna)', !!luna, `dogId=${luna}`);

  // White-label público
  const theme = await call('GET', '/api/public/partners/by-slug/aseguradora-demo/theme');
  check('GET theme white-label', theme.status === 200, `appName=${theme.data?.branding?.appName}`);

  // Seguro (tutor)
  const cov = await call('GET', `/api/dogs/${luna}/policy/coverage-check?event=accidente`, { token: tToken });
  check('coverage-check (con disclaimer)', cov.status === 200 && !!cov.data?.disclaimer, `likelyCovered=${cov.data?.likelyCovered}`);
  const cert = await call('POST', `/api/dogs/${luna}/certificate`, { token: tToken });
  check('emitir certificado', cert.status === 201, `level=${cert.data?.confidenceLevel}`);
  const share = await call('POST', `/api/dogs/${luna}/certificate/share`, { token: tToken, body: { partnerId: pid } });
  check('compartir certificado (con consentimiento)', share.status === 200 && share.data?.shared === true);

  // Panel partner_admin
  const metrics = await call('GET', `/api/partners/${pid}/metrics`, { token: paToken });
  check('métricas (mes en curso)', metrics.status === 200, `activas=${metrics.data?.activePets}/${metrics.data?.totalPets}`);
  const billingNow = await call('GET', `/api/partners/${pid}/billing?month=${metrics.data?.month}`, { token: paToken });
  check('facturación del mes en curso', billingNow.status === 200, `total=${billingNow.data?.total} ${billingNow.data?.currency}`);

  // Aislamiento multi-tenant
  const cross = await call('GET', '/api/partners/000000000000000000000000/metrics', { token: paToken });
  check('cross-partner → 403', cross.status === 403);
  const tutorMetrics = await call('GET', `/api/partners/${pid}/metrics`, { token: tToken });
  check('tutor → métricas → 403', tutorMetrics.status === 403);

  // API v1 (API key)
  const v1pet = await call('GET', `/api/v1/pets/${luna}`, { apiKey: KEY });
  check('v1/pets sin dato clínico', v1pet.status === 200 && v1pet.data?.vaccinations === undefined, `name=${v1pet.data?.name}`);
  const v1cert = await call('GET', `/api/v1/pets/${luna}/certificate`, { apiKey: KEY });
  check('v1/pets/certificate sin score', v1cert.status === 200 && v1cert.data?.score === undefined, `level=${v1cert.data?.confidenceLevel}`);
  const badKey = await call('GET', `/api/v1/pets/${luna}`, { apiKey: 'mp_wrong' });
  check('v1 API key inválida → 401', badKey.status === 401);

  console.log(`\n${fails === 0 ? '✅ TODO OK' : `❌ ${fails} fallo(s)`}`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error('smoke failed (¿server levantado con COMPANION_ENABLED=true?):', e.message); process.exit(1); });
