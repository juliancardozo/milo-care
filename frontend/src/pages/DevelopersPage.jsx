import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

/**
 * Referencia de API para desarrolladores (estilo Pomelo/Stripe), renderizada con
 * Scalar a partir de nuestro openapi.yaml (single source of truth en el backend,
 * sincronizado a /public por el script copy-openapi).
 */
export default function DevelopersPage() {
  return (
    <ApiReferenceReact
      configuration={{
        url: '/openapi.yaml',
        theme: 'default',
        hideDownloadButton: false,
        metaData: {
          title: 'Milo Care — API Reference',
          description: 'API de la capa Companion (B2B2C) de Milo Care.',
        },
      }}
    />
  );
}
