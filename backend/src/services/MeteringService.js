'use strict';

const User = require('../models/User');
const UsageRecord = require('../models/UsageRecord');
const BillingRecord = require('../models/BillingRecord');
const InsuranceLead = require('../models/InsuranceLead');
const { isPetActive, monthRange } = require('./petActivity');

// 'YYYY-MM' (UTC) de una fecha.
function monthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Mes anterior al de `now` (lo que se factura el billingDay).
function previousMonthKey(now = new Date()) {
  return monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}

/**
 * Computa las mascotas activas de un partner en un mes y persiste los UsageRecord
 * (idempotente). Atribución: perros embebidos con `dog.partnerId === partner._id`.
 * @returns {Promise<{ activePets: number, totalPets: number }>}
 */
async function computePartnerUsage(partner, month) {
  const users = await User.find({ 'dogs.partnerId': partner._id }).select('_id dogs').lean();

  let activePets = 0;
  let totalPets = 0;
  const ops = [];

  for (const user of users) {
    for (const dog of user.dogs || []) {
      if (String(dog.partnerId) !== String(partner._id)) continue;
      totalPets += 1;
      const active = isPetActive(dog, month);
      if (active) activePets += 1;
      ops.push(
        UsageRecord.updateOne(
          { partnerId: partner._id, dogId: dog._id, month },
          { $set: { ownerUserId: user._id, isActive: active, computedAt: new Date() } },
          { upsert: true },
        ),
      );
    }
  }

  await Promise.all(ops);
  return { activePets, totalPets };
}

/**
 * Lead-gen del mes: leads calificados creados (CPL) y pólizas convertidas (CPA).
 * @returns {Promise<{ qualifiedLeads: number, convertedPolicies: number }>}
 */
async function computePartnerLeadGen(partner, month) {
  const { start, end } = monthRange(month);
  const qualifiedLeads = await InsuranceLead.countDocuments({
    partnerId: partner._id, createdAt: { $gte: new Date(start), $lt: new Date(end) },
  });
  const convertedPolicies = await InsuranceLead.countDocuments({
    partnerId: partner._id, status: 'converted', convertedAt: { $gte: new Date(start), $lt: new Date(end) },
  });
  return { qualifiedLeads, convertedPolicies };
}

/**
 * Genera (upsert idempotente) el BillingRecord del partner para el mes.
 * total = setupFee (una vez) + activePets*price + leads*CPL + conversiones*CPA.
 */
async function generateBillingRecord(partner, month) {
  const { activePets } = await computePartnerUsage(partner, month);
  const { qualifiedLeads, convertedPolicies } = await computePartnerLeadGen(partner, month);
  const contract = partner.contract || {};
  const pricePerActivePet = contract.pricePerActivePet || 0;
  const currency = contract.currency || 'USD';

  // setupFee una sola vez: se aplica si no hay ninguna factura previa (de OTRO mes).
  const prior = await BillingRecord.findOne({ partnerId: partner._id, month: { $ne: month } }).select('_id').lean();
  const setupFeeApplied = prior ? 0 : (contract.setupFee || 0);

  const leadRevenue = qualifiedLeads * (contract.pricePerLead || 0) + convertedPolicies * (contract.pricePerConversion || 0);
  const total = setupFeeApplied + activePets * pricePerActivePet + leadRevenue;

  return BillingRecord.findOneAndUpdate(
    { partnerId: partner._id, month },
    { $set: { setupFeeApplied, activePets, pricePerActivePet, qualifiedLeads, convertedPolicies, leadRevenue, total, currency, status: 'issued' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

module.exports = { monthKey, previousMonthKey, computePartnerUsage, generateBillingRecord };
