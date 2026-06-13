'use strict';

const jwt = require('jsonwebtoken');

// Pase "Genérico" de Google Wallet con el flujo "Save to Google Wallet" basado en JWT
// firmado. Como el pase es un snapshot estático (ver decisión de producto), el objeto se
// embebe inline en el JWT y Google lo crea al guardarlo: no hace falta pre-insertar objetos
// vía REST ni persistir IDs en Mongo. La Generic Class (plantilla) se crea una sola vez con
// scripts/createWalletClass.js.

const SAVE_URL_PREFIX = 'https://pay.google.com/gp/v/save/';
const LANG = 'es';

// Lazy: solo se parsea cuando realmente se genera un pase, así un .env sin credenciales no
// rompe el arranque del servidor (mismo criterio que EmailService con RESEND_API_KEY).
let _credentials = null;
function getCredentials() {
  const b64 = process.env.GOOGLE_WALLET_SA_KEY_B64;
  if (!b64) {
    throw new Error(
      'GOOGLE_WALLET_SA_KEY_B64 is not set. Add the base64-encoded service account key to backend/.env.'
    );
  }
  if (!_credentials) {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    _credentials = JSON.parse(json);
  }
  return _credentials;
}

function getIssuerId() {
  const id = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!id) throw new Error('GOOGLE_WALLET_ISSUER_ID is not set.');
  return id;
}

function getClassId() {
  return `${getIssuerId()}.${process.env.GOOGLE_WALLET_CLASS_ID || 'milo_dog_card'}`;
}

function appUrl() {
  return process.env.APP_URL || 'http://localhost:5173';
}

// Normaliza una base a https:// (agrega protocolo si falta, sube http→https) y quita
// la barra final. Garantiza que los links del pase (QR, ficha pública) sean siempre https.
function ensureHttps(url) {
  const u = String(url || '').trim().replace(/\/+$/, '');
  if (!u) return u;
  if (/^https:\/\//i.test(u)) return u;
  if (/^http:\/\//i.test(u)) return u.replace(/^http:\/\//i, 'https://');
  return `https://${u}`;
}

// Base pública del QR del pase. Debe ser un dominio accesible desde cualquier teléfono
// (no localhost), porque lo escanea quien encuentra al perro. Cae a APP_URL si no se define.
// Siempre se sirve por https (ver ensureHttps).
function publicBaseUrl() {
  return ensureHttps(process.env.WALLET_PUBLIC_BASE_URL || appUrl());
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Fecha de vencimiento más próxima (>= now) entre ítems de salud, ignorando cancelados.
function soonestDueDate(items, now) {
  return (items || [])
    .filter((it) => it && it.nextDueDate && it.status !== 'cancelled')
    .map((it) => new Date(it.nextDueDate))
    .filter((d) => !isNaN(d.getTime()) && d >= now)
    .sort((a, b) => a - b)[0] || null;
}

function i18nValue(value) {
  return { defaultValue: { language: LANG, value: String(value) } };
}

// Rango de reconocimiento según la racha de cuidado (gamificación de estatus).
function rankLabel(streak = 0, isPremium = false) {
  let base;
  if (streak >= 100) base = 'Centinela Leyenda';
  else if (streak >= 30) base = 'Centinela de Oro';
  else if (streak >= 7) base = 'Centinela';
  else base = 'Tutor Milo Care';
  return isPremium ? `${base} · Premium` : base;
}

// Arma el Generic Object combinado (identidad + salud + reconocimiento) para un perro.
// `meta` aporta los datos de estatus social: { streak, totalCheckins, isPremium, memberSince }.
function buildDogPassObject(user, dog, now = new Date(), meta = {}) {
  const dogId = String(dog._id || dog.id);
  // id único por regeneración → cada vez que el usuario regenera, obtiene un snapshot fresco.
  const objectId = `${getIssuerId()}.${dogId}-${now.getTime()}`;

  const nextVaccine = soonestDueDate(dog.vaccinations, now);
  const nextDeworming = soonestDueDate(dog.dewormingHistory, now);

  const streak = Number(meta.streak) || 0;
  const isPremium = Boolean(meta.isPremium);
  const memberYear = meta.memberSince ? new Date(meta.memberSince).getFullYear() : (dog.createdAt ? new Date(dog.createdAt).getFullYear() : now.getFullYear());

  // ── Reconocimiento social (al frente del pase vía la plantilla de clase) ──
  const textModulesData = [
    { id: 'days_caring', header: 'Racha de cuidado', body: `${streak} ${streak === 1 ? 'día' : 'días'} 🔥` },
    { id: 'rank', header: 'Rango', body: rankLabel(streak, isPremium) },
    { id: 'status', header: 'Estado', body: isPremium ? 'Tutor Premium' : 'Miembro Milo Care' },
    { id: 'member_since', header: 'Miembro desde', body: String(memberYear) },
  ];
  if (Number(meta.totalCheckins) > 0) {
    textModulesData.push({ id: 'contributions', header: 'Check-ins', body: `${meta.totalCheckins} registros de cuidado` });
  }

  // Solo se incluyen filas con datos para no mostrar campos vacíos en el pase.
  if (dog.microchipId) {
    textModulesData.push({ id: 'microchip', header: 'Microchip', body: dog.microchipId });
  }
  if (user && user.name) {
    textModulesData.push({ id: 'owner', header: 'Dueño/a', body: user.name });
  }
  if (dog.ownerPhone) {
    textModulesData.push({ id: 'owner_phone', header: 'Tel. dueño/a', body: dog.ownerPhone });
  }
  if (dog.veterinarianName) {
    textModulesData.push({ id: 'vet', header: 'Veterinario/a', body: dog.veterinarianName });
  }
  if (dog.veterinarianPhone) {
    textModulesData.push({ id: 'vet_phone', header: 'Tel. veterinario/a', body: dog.veterinarianPhone });
  }
  textModulesData.push({
    id: 'next_vaccine',
    header: 'Próxima vacuna',
    body: nextVaccine ? fmtDate(nextVaccine) : 'Al día / sin datos',
  });
  textModulesData.push({
    id: 'next_deworming',
    header: 'Próxima desparasitación',
    body: nextDeworming ? fmtDate(nextDeworming) : 'Al día / sin datos',
  });

  // Botones tappables dentro del pase: ficha pública + llamar al dueño/vet.
  const publicUrl = `${publicBaseUrl()}/p/${dogId}`;
  const uris = [{ id: 'profile', uri: publicUrl, description: 'Ver ficha de la mascota' }];
  if (dog.ownerPhone) {
    uris.push({ id: 'call_owner', uri: `tel:${dog.ownerPhone}`, description: 'Llamar al dueño/a' });
  }
  if (dog.veterinarianPhone) {
    uris.push({ id: 'call_vet', uri: `tel:${dog.veterinarianPhone}`, description: 'Llamar al veterinario/a' });
  }

  const object = {
    id: objectId,
    classId: getClassId(),
    state: 'ACTIVE',
    cardTitle: i18nValue('Milo Care'),
    header: i18nValue(dog.name),
    // Negro-violeta premium, alineado con la identidad de marca.
    hexBackgroundColor: '#13111f',
    textModulesData,
    linksModuleData: { uris },
    barcode: {
      type: 'QR_CODE',
      value: publicUrl,
      alternateText: dog.name,
    },
  };

  if (dog.breed) object.subheader = i18nValue(dog.breed);
  // Logo de marca: solo si hay una imagen pública válida (WALLET_LOGO_URL).
  if (process.env.WALLET_LOGO_URL) {
    object.logo = {
      sourceUri: { uri: process.env.WALLET_LOGO_URL },
      contentDescription: i18nValue('Milo Care'),
    };
  }
  if (dog.photoUrl) {
    object.heroImage = {
      sourceUri: { uri: dog.photoUrl },
      contentDescription: i18nValue(dog.name),
    };
  }

  return object;
}

// Firma el JWT de "Save to Google Wallet" y devuelve la URL que abre el botón.
function generateSaveUrl(user, dog, now = new Date(), meta = {}) {
  const credentials = getCredentials();
  const object = buildDogPassObject(user, dog, now, meta);

  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(now.getTime() / 1000),
    origins: [appUrl()],
    payload: { genericObjects: [object] },
  };

  const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
  return `${SAVE_URL_PREFIX}${token}`;
}

module.exports = {
  buildDogPassObject,
  generateSaveUrl,
  getClassId,
  // Exportados para tests / reuso interno.
  _internal: { soonestDueDate, getCredentials },
};
