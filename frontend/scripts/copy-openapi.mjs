// Copia el spec OpenAPI del backend a public/ para que la página /developers
// (Scalar) lo sirva mismo-origen en dev y prod. Single source of truth: backend/openapi.yaml.
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../../backend/openapi.yaml');
const dest = join(here, '../public/openapi.yaml');

if (!existsSync(src)) {
  console.warn('[copy-openapi] no se encontró backend/openapi.yaml — se omite.');
  process.exit(0);
}
copyFileSync(src, dest);
console.log('[copy-openapi] backend/openapi.yaml → public/openapi.yaml');
