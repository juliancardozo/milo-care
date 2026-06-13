import { getVapidKey, subscribePush, unsubscribePush } from '../services/pushApi';

// Soporte de notificaciones push en este navegador.
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// iOS solo soporta web push si la PWA está instalada (agregada a inicio).
export function isIosNotInstalled() {
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const installed = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
  return isIos && !installed;
}

// Plataforma para guiar el opt-in (cada SO habilita las notificaciones distinto).
export function getPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  return 'other';
}

export function notificationPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
}

export function isStandalone() {
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getRegistration() {
  return navigator.serviceWorker.getRegistration() || navigator.serviceWorker.ready;
}

/** Estado actual: ¿hay una suscripción push activa en este navegador? */
export async function getPushSubscribed() {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

/**
 * Activa las notificaciones push: pide permiso, se suscribe y lo registra en el
 * backend. Devuelve { ok } o lanza Error con un código de motivo.
 */
export async function enablePush() {
  if (!isPushSupported()) throw new Error('unsupported');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const { data } = await getVapidKey();
  if (!data?.publicKey) throw new Error('no-key');

  const reg = await getRegistration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  await subscribePush(sub.toJSON());
  return { ok: true };
}

/** Desactiva las notificaciones push en este navegador. */
export async function disablePush() {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await unsubscribePush(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
