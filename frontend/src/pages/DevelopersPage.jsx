import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

/**
 * Referencia de API para desarrolladores (estilo Pomelo/Stripe), renderizada con
 * Scalar a partir de nuestro openapi (single source of truth en el backend,
 * sincronizado a /public por el script copy-openapi).
 *
 * - Pública (`/developers`): spec recortado para integradores externos
 *   (openapi.partners.yaml) — Auth + Aseguradoras + Partners + webhooks.
 * - Interna (`/developers/internal`): spec completo (todas las audiencias).
 */
export default function DevelopersPage({ internal = false }) {
  const url = internal ? '/openapi.yaml' : '/openapi.partners.yaml';
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
