'use strict';

const MercadoPagoService = require('./MercadoPagoService');

/**
 * ChargeService — cobro automático del BillingRecord al partner. Máquina de estados
 * sobre `BillingRecord.status` (issued → paid | failed), idempotente y resiliente.
 *
 * Si el partner no tiene `billing.autoCharge`, la factura queda manual (issued) y
 * no se cobra: el MVP solo emite reporte/factura para esos partners.
 */
async function chargeBillingRecord(billingRecord, partner, { now = new Date() } = {}) {
  if (billingRecord.status === 'paid') {
    return { charged: true, alreadyPaid: true };
  }

  // Nada que cobrar.
  if (!billingRecord.total || billingRecord.total <= 0) {
    billingRecord.status = 'paid';
    billingRecord.chargedAt = now;
    await billingRecord.save();
    return { charged: true, zero: true };
  }

  if (!partner.billing?.autoCharge) {
    return { charged: false, reason: 'manual' };
  }

  billingRecord.chargeAttempts = (billingRecord.chargeAttempts || 0) + 1;
  try {
    const payment = await MercadoPagoService.chargePartner({
      partner,
      amount: billingRecord.total,
      currency: billingRecord.currency,
      description: `Milo Care — facturación ${billingRecord.month}`,
      idempotencyKey: `${partner._id}-${billingRecord.month}`,
    });

    if (payment.status === 'approved') {
      billingRecord.status = 'paid';
      billingRecord.chargedAt = now;
      billingRecord.chargeRef = String(payment.id);
      billingRecord.chargeError = null;
    } else {
      billingRecord.status = 'failed';
      billingRecord.chargeError = `payment_${payment.status}`;
    }
    await billingRecord.save();
    return { charged: billingRecord.status === 'paid', status: billingRecord.status };
  } catch (err) {
    billingRecord.status = 'failed';
    billingRecord.chargeError = err.code || err.message;
    await billingRecord.save();
    return { charged: false, status: 'failed', error: billingRecord.chargeError };
  }
}

module.exports = { chargeBillingRecord };
