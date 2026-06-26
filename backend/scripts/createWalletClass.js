'use strict';

// Crea o ACTUALIZA la Generic Class de Google Wallet que usan los pases de los perros.
// Define la plantilla de la tarjeta (cardTemplateInfo) con un layout de reconocimiento
// social: racha de cuidado, rango, estado y antigüedad. Idempotente: si la clase ya
// existe, la actualiza (PUT) para aplicar/refrescar la plantilla.
//
//   node scripts/createWalletClass.js
//
// Requiere en backend/.env: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLASS_ID (opcional),
// GOOGLE_WALLET_SA_KEY_B64.

require('dotenv').config();

const { GoogleAuth } = require('google-auth-library');
const { getClassId } = require('../src/services/GoogleWalletService');

const BASE = 'https://walletobjects.googleapis.com/walletobjects/v1';
const SITE = 'https://milocare.org';
// Banner opcional: solo se incluye si hay una imagen pública accesible (Google la valida).
const LOGO = process.env.WALLET_LOGO_URL || '';

function buildGenericClass(classId) {
  const cls = {
    id: classId,
    // Plantilla de la cara del pase: dos filas de reconocimiento social.
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['days_caring']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['rank']" }] } },
            },
          },
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['status']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['member_since']" }] } },
            },
          },
        ],
      },
    },
    // Descripción del programa (aparece en el detalle del pase).
    textModulesData: [
      {
        id: 'program_overview',
        header: 'Programa Milo Care',
        body: 'Cada día que cuidás a tu perro suma a tu rango. Sé parte de la comunidad que cuida la salud de los perros de tu zona.',
      },
    ],
    linksModuleData: {
      uris: [{ id: 'official_site', uri: SITE, description: 'milocare.org' }],
    },
  };

  // Banner del programa: solo si hay una imagen pública válida (evita rechazo de la API).
  if (LOGO) {
    cls.imageModulesData = [
      {
        id: 'badge_banner',
        mainImage: {
          sourceUri: { uri: LOGO },
          contentDescription: { defaultValue: { language: 'es', value: 'Milo Care' } },
        },
      },
    ];
  }

  return cls;
}

async function main() {
  const b64 = process.env.GOOGLE_WALLET_SA_KEY_B64;
  if (!b64) throw new Error('GOOGLE_WALLET_SA_KEY_B64 is not set.');

  const credentials = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });
  const client = await auth.getClient();
  const classId = getClassId();
  const genericClass = buildGenericClass(classId);

  let exists = false;
  try {
    await client.request({ url: `${BASE}/genericClass/${encodeURIComponent(classId)}`, method: 'GET' });
    exists = true;
  } catch (err) {
    const status = err.response && err.response.status;
    if (status && status !== 404) throw err;
  }

  if (exists) {
    await client.request({
      url: `${BASE}/genericClass/${encodeURIComponent(classId)}`,
      method: 'PUT',
      data: genericClass,
    });
    console.log(`✓ Updated generic class template: ${classId}`);
  } else {
    await client.request({ url: `${BASE}/genericClass`, method: 'POST', data: genericClass });
    console.log(`✓ Created generic class: ${classId}`);
  }
}

main().catch((err) => {
  console.error('✗ Failed to create/update wallet class:', err.message || err);
  process.exit(1);
});
