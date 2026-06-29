'use strict';

/**
 * Lista o crea el precio recurrente mensual del plan Premium en Paddle (sandbox).
 * Si el producto ya tiene un precio, lo muestra; si no, crea uno.
 *
 * Uso:
 *   En backend/.env: PADDLE_API_URL, PADDLE_API_KEY (y opcional PADDLE_PRODUCT_ID).
 *   cd backend && node scripts/paddle-setup-price.js
 *
 * Variables opcionales:
 *   PADDLE_PRODUCT_ID  (default: el producto Premium ya creado)
 *   PREMIUM_USD        (default: 4 → USD 4.00/mes)
 */

require('dotenv').config();

const API = (process.env.PADDLE_API_URL || 'https://api.paddle.com').replace(/\/+$/, '');
const KEY = process.env.PADDLE_API_KEY;
const PRODUCT_ID = process.env.PADDLE_PRODUCT_ID || 'pro_01kwacbecgpv9cgp9zabetebhx';
const USD = Number(process.env.PREMIUM_USD || 4);

function headers() {
  return { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
}

async function listPrices() {
  const res = await fetch(`${API}/prices?product_id=${PRODUCT_ID}&status=active`, { headers: headers() });
  const json = await res.json();
  if (!res.ok) throw new Error(`list prices ${res.status}: ${JSON.stringify(json)}`);
  return json.data || [];
}

async function createPrice() {
  const body = {
    description: 'Milo Care Premium — mensual',
    product_id: PRODUCT_ID,
    unit_price: { amount: String(Math.round(USD * 100)), currency_code: 'USD' },
    billing_cycle: { interval: 'month', frequency: 1 },
    quantity: { minimum: 1, maximum: 1 },
  };
  const res = await fetch(`${API}/prices`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`create price ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
}

async function main() {
  if (!KEY) { console.error('✗ Falta PADDLE_API_KEY en backend/.env'); process.exit(1); }
  console.log('API URL    :', API);
  console.log('PRODUCT_ID :', PRODUCT_ID);

  const existing = await listPrices();
  if (existing.length) {
    console.log(`\n✓ El producto ya tiene ${existing.length} precio(s):`);
    for (const p of existing) {
      const amt = p.unit_price?.amount, cur = p.unit_price?.currency_code;
      const cyc = p.billing_cycle ? `${p.billing_cycle.frequency} ${p.billing_cycle.interval}` : 'one-time';
      console.log(`   ${p.id}  →  ${amt} ${cur} / ${cyc}  (${p.status})`);
    }
    console.log('\nCopiá el pri_... recurrente a PADDLE_PRICE_ID en backend/.env');
    return;
  }

  console.log('\nNo hay precios. Creando uno recurrente mensual de USD', USD, '...');
  const price = await createPrice();
  console.log('✓ Precio creado:', price.id);
  console.log(`   ${price.unit_price.amount} ${price.unit_price.currency_code} / mes`);
  console.log('\n👉 Agregá a backend/.env:  PADDLE_PRICE_ID=' + price.id);
}

main().catch((err) => { console.error('✗', err.message); process.exit(1); });
