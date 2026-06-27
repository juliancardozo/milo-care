import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

/**
 * Referencia de API para desarrolladores (estilo Pomelo/Stripe), renderizada con
 * Scalar a partir de nuestro openapi (single source of truth en el backend,
 * sincronizado a /public por el script copy-openapi).
 *
 * - Pública (`/developers`): spec recortado para integradores externos
 *   (openapi.partners.json) — Auth + Aseguradoras + Partners + webhooks.
 * - Interna (`/developers/internal`): spec completo (todas las audiencias).
 *
 * Nota: se sirve .json (no .yaml) porque Amplify reescribe a index.html las rutas
 * con extensión fuera de su lista blanca, y `.yaml` no está; `.json` sí.
 */
export default function DevelopersPage({ internal = false }) {
  const url = internal ? '/openapi.json' : '/openapi.partners.json';
  return (
    <ApiReferenceReact
      configuration={{
        url,
        theme: 'default',
        hideDownloadButton: false,
        metaData: internal
          ? { title: 'Milo Care — API Reference (interno)', description: 'Spec completo de la API de Milo Care.' }
          : { title: 'Milo Care — API para Partners', description: 'API-first: integrá la salud y el Pet Score de las mascotas con tu producto.' },
      }}
    />
  );
}
