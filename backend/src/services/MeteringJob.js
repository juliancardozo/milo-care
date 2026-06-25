'use strict';

const cron = require('node-cron');
const Partner = require('../models/Partner');
const featureFlags = require('../config/featureFlags');
const MeteringService = require('./MeteringService');

/**
 * Job mensual de metering/facturación B2B2C. Corre a diario 03:00 y procesa cada
 * partner activo SOLO en su `billingDay`, facturando el mes anterior. Genera el
 * BillingRecord (reporte/factura); no cobra automáticamente al partner.
 */
async function runMetering(now = new Date()) {
  const month = MeteringService.previousMonthKey(now);
  const partners = await Partner.find({ status: 'active' });
  const results = [];

  for (const partner of partners) {
    const billingDay = partner.contract?.billingDay || 1;
    if (now.getUTCDate() !== billingDay) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const record = await MeteringService.generateBillingRecord(partner, month);
      results.push(record);
    } catch (err) {
      console.error('[Metering] partner', String(partner._id), 'failed:', err.message);
    }
  }

  return results;
}

function startMeteringJob() {
  if (!featureFlags.companionEnabled) return; // metering solo si la capa B2B2C está activa
  cron.schedule('0 3 * * *', () => {
    runMetering(new Date()).catch((err) => console.error('[Metering] job failed:', err.message));
  });
  console.log('[Metering] monthly billing job scheduled (daily 03:00, runs on each partner billingDay)');
}

module.exports = { startMeteringJob, runMetering };
