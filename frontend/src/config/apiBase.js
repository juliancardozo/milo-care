// Base de la API, resuelta en build time.
//
// Default `/api`: en producción (Amplify rama `main`) el custom rule de la app
// reescribe /api/* al backend de Render, y en local lo hace el proxy de Vite.
// Las custom rules de Amplify son a nivel APP (no por rama), así que para que la
// rama `develop` hable con un backend de staging se setea, solo en esa rama,
// VITE_API_BASE_URL=https://<backend-staging>/api (ver docs/devops/ENVIRONMENTS.md).
export function resolveApiBaseUrl(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  return (value || '/api').replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

/** URL absoluta/relativa a un endpoint de la API (para href/src fuera de axios). */
export const apiUrl = (path) => `${API_BASE_URL}${String(path).startsWith('/') ? '' : '/'}${path}`;
