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

// Base pública del QR del pase. Debe ser un dominio accesible desde cualquier teléfono
// (no localhost), porque lo escanea quien encuentra al perro. Cae a APP_URL si no se define.
function publicBaseUrl() {
  return process.env.WALLET_PUBLIC_BASE_URL || appUrl();
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

// Arma el Generic Object combinado (identidad + estado de salud) para un perro.
function buildDogPassObject(user, dog, now = new Date()) {
  const dogId = String(dog._id || dog.id);
  // id único por regeneración → cada vez que el usuario regenera, obtiene un snapshot fresco.
  const objectId = `${getIssuerId()}.${dogId}-${now.getTime()}`;

  const nextVaccine = soonestDueDate(dog.vaccinations, now);
  const nextDeworming = soonestDueDate(dog.dewormingHistory, now);

  // Solo se incluyen filas con datos para no mostrar campos vacíos en el pase.
  const textModulesData = [];
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
    hexBackgroundColor: '#4f8ef7',
    textModulesData,
    linksModuleData: { uris },
    barcode: {
      type: 'QR_CODE',
      value: publicUrl,
      alternateText: dog.name,
    },
  };

  if (dog.breed) object.subheader = i18nValue(dog.breed);
  if (dog.photoUrl) {
    object.heroImage = {
      sourceUri: { uri: dog.photoUrl },
      contentDescription: i18nValue(dog.name),
    };
  }

  return object;
}

// Firma el JWT de "Save to Google Wallet" y devuelve la URL que abre el botón.
function generateSaveUrl(user, dog, now = new Date()) {
  const credentials = getCredentials();
  const object = buildDogPassObject(user, dog, now);

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
