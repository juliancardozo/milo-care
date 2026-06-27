// Sincroniza el spec OpenAPI del backend a public/ para que la página /developers
// (Scalar) lo sirva mismo-origen en dev y prod. Single source of truth: backend/openapi.yaml.
//
// Genera DOS specs:
//   - openapi.yaml          → completo (referencia interna).
//   - openapi.partners.yaml → vista PÚBLICA para integradores: solo las audiencias
//     externas (Auth, Aseguradoras, Partners) + webhooks. Oculta Admin y Tutores
//     (API interna de la app) y todo lo marcado x-internal.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../backend/openapi.yaml');
const destFull = join(here, '../public/openapi.yaml');
const destPartners = join(here, '../public/openapi.partners.yaml');
// La app carga JSON: Amplify reescribe a index.html cualquier ruta cuya extensión
// no esté en su lista blanca, y `.yaml` no está (pero `.json` sí). Sirviendo .json
// el spec se entrega tal cual en producción.
const destFullJson = join(here, '../public/openapi.json');
const destPartnersJson = join(here, '../public/openapi.partners.json');

if (!existsSync(src)) {
  console.warn('[copy-openapi] no se encontró backend/openapi.yaml — se omite.');
  process.exit(0);
}

const raw = readFileSync(src, 'utf8');
writeFileSync(destFull, raw);
writeFileSync(destFullJson, JSON.stringify(parse(raw), null, 2));
console.log('[copy-openapi] backend/openapi.yaml → public/openapi.yaml');

// ── Vista pública para integradores externos ─────────────────────────────────
const PUBLIC_TAGS = new Set(['Autenticación', 'API para Aseguradoras', 'API para Partners']);

const doc = parse(raw);

// Filtrar paths: dejar solo operaciones cuyo primer tag sea público y no x-internal.
const paths = {};
for (const [path, ops] of Object.entries(doc.paths || {})) {
  const kept = {};
  for (const [method, op] of Object.entries(ops)) {
    if (op && typeof op === 'object' && !op['x-internal'] && PUBLIC_TAGS.has((op.tags || [])[0])) {
      kept[method] = op;
    }
  }
  if (Object.keys(kept).length) paths[path] = kept;
}

// Conservar la sección "## Webhooks ..." de la intro (útil para integradores).
const fullDesc = doc.info?.description || '';
const webhooksSection = fullDesc.includes('## Webhooks') ? '\n\n' + fullDesc.slice(fullDesc.indexOf('## Webhooks')) : '';

const partners = {
  ...doc,
  info: {
    ...doc.info,
    title: 'Milo Care — API para Partners',
    description:
      'Referencia para integradores (aseguradoras / fintech / banco). Incluye autenticación, '
      + 'la API de partners y los webhooks. Para integrar, pedinos tu API key.'
      + webhooksSection,
  },
  tags: (doc.tags || []).filter((t) => PUBLIC_TAGS.has(t.name)),
  paths,
  // webhooks se conservan tal cual (son el canal de salida hacia el partner).
};

writeFileSync(destPartners, stringify(partners));
writeFileSync(destPartnersJson, JSON.stringify(partners, null, 2));
console.log('[copy-openapi] backend/openapi.yaml → public/openapi.partners.{yaml,json} (vista externa)');
