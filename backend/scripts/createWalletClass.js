'use strict';

// Crea (una sola vez) la Generic Class de Google Wallet que usan los pases de los perros.
// Idempotente: si la clase ya existe, no hace nada.
//
//   node scripts/createWalletClass.js
//
// Requiere en backend/.env: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_CLASS_ID (opcional),
// GOOGLE_WALLET_SA_KEY_B64.

require('dotenv').config();

const { GoogleAuth } = require('google-auth-library');
const { getClassId } = require('../src/services/GoogleWalletService');

const BASE = 'https://walletobjects.googleapis.com/walletobjects/v1';

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

  // ¿Ya existe?
  try {
    await client.request({ url: `${BASE}/genericClass/${encodeURIComponent(classId)}`, method: 'GET' });
    console.log(`✓ Generic class already exists: ${classId}`);
    return;
  } catch (err) {
    const status = err.response && err.response.status;
    if (status && status !== 404) throw err;
  }

  await client.request({
    url: `${BASE}/genericClass`,
    method: 'POST',
    data: { id: classId },
  });
  console.log(`✓ Created generic class: ${classId}`);
}

main().catch((err) => {
  console.error('✗ Failed to create wallet class:', err.message || err);
  process.exit(1);
});
