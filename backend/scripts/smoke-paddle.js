'use strict';

/**
 * Smoke test del adapter de Paddle (sandbox). Crea una transacción real con el
 * PaddleService y muestra la URL de checkout. No toca la base de datos.
 *
 * Uso:
 *   1) En backend/.env (gitignoreado) poné:
 *        BILLING_PROVIDER=paddle
 *        PADDLE_API_URL=https://sandbox-api.paddle.com
 *        PADDLE_API_KEY=...            (tu sandbox key)
 *        PADDLE_PRICE_ID=pri_...       (precio recurrente del plan Premium en sandbox)
 *        PADDLE_WEBHOOK_SECRET=...     (opcional, para el test de firma)
 *   2) cd backend && node scripts/smoke-paddle.js
 */

require('dotenv').config();

const PaddleService = require('../src/services/PaddleService');

function mask(v) {
  if (!v) return '(vacío)';
  const s = String(v);
  return s.length <= 8 ? '****' : `${s.slice(0, 4)}…${s.slice(-4)}`;
}

async function main() {
  console.log('— Smoke Paddle (sandbox) —');
  console.log('API URL    :', process.env.PADDLE_API_URL || 'https://api.paddle.com (PROD!)');
  console.log('API KEY    :', mask(process.env.PADDLE_API_KEY));
  console.log('PRICE ID   :', process.env.PADDLE_PRICE_ID || '(vacío)');
  console.log('isConfigured:', PaddleService.isConfigured());
  console.log('');

  if (!PaddleService.isConfigured()) {
    console.error('✗ Falta PADDLE_API_KEY y/o PADDLE_PRICE_ID en backend/.env');
    process.exit(1);
  }

  // Usuario falso solo para el checkout (no se guarda nada).
  const fakeUser = { _id: 'smoke-user-1', email: 'sandbox-tester@milocare.org' };

  try {
    const { checkoutUrl, transactionId } = await PaddleService.createCheckout({ user: fakeUser });
    console.log('✓ Transacción creada:', transactionId || '(sin id)');
    if (checkoutUrl) {
      console.log('✓ Checkout URL:', checkoutUrl);
      console.log('\nAbrí esa URL en el navegador y pagá con una tarjeta de prueba de Paddle.');
    } else {
      console.log('⚠ La transacción se creó pero NO vino checkout.url.');
      console.log('  Configurá un "default payment link" en el dashboard de Paddle');
      console.log('  (Checkout → Settings) para que la URL hosted venga poblada.');
    }
  } catch (err) {
    console.error('✗ Error creando checkout:', err.code || '', err.message);
    process.exit(1);
  }
}

main();
