import { useEffect, useReducer } from 'react';

// Gestión del prompt de instalación de la PWA. El evento `beforeinstallprompt`
// puede dispararse antes de montar cualquier componente, por eso capturamos a
// nivel de módulo (importado temprano desde main.jsx).

let deferred = null;
const listeners = new Set();
function notify() { listeners.forEach((l) => l()); }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isStandalone() {
  return (typeof window !== 'undefined') &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);
}

export function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

export function canInstall() {
  return Boolean(deferred);
}

export async function promptInstall() {
  if (!deferred) return 'unavailable';
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome;
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Hook que re-renderiza cuando cambia el estado de instalabilidad.
export function useInstallPrompt() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return {
    installable: canInstall(),
    installed: isStandalone(),
    ios: isIos(),
    promptInstall,
  };
}
