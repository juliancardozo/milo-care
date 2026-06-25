'use strict';

/**
 * Ejercita la capa Companion sobre los datos sembrados por seed-companion-demo.js,
 * llamando a los servicios de dominio (sin levantar el server). Imprime resultados
 * para verificar metering, facturación, cobro, certificado, cobertura, claims y webhook.
 *
 *   cd backend && node scripts/verify-companion-demo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Partner = require('../src/models/Partner');
const User = require('../src/models/User');
const InsurancePolicy = require('../src/models/InsurancePolicy');
const MeteringService = require('../src/services/MeteringService');
const MetricsService = require('../src/services/MetricsService');
const ChargeService = require('../src/services/ChargeService');
const CertificateService = require('../src/services/CertificateService');
const ConsentService = require('../src/services/ConsentService');
const CoverageService = require('../src/services/CoverageService');
const ClaimsService = require('../src/services/ClaimsService');
const WebhookService = require('../src/services/WebhookService');

const SLUG = 'aseguradora-demo';
const line = (t) => console.log(`\n── ${t} ──`);
const j = (o) => JSON.stringify(o, null, 2);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const partner = await Partner.findOne({ slug: SLUG });
  if (!partner) throw new Error('No hay seed: corré seed-companion-demo.js primero.');
  const ana = await User.findOne({ email: 'ana@companion-demo.test' });
  const beto = await User.findOne({ email: 'beto@companion-demo.test' });
  const luna = ana.dogs[0];
  const toby = beto.dogs[0];
  const month = MeteringService.monthKey(new Date());

  console.log(`Partner: ${partner.name} | mes: ${month} | contrato: setup ${partner.contract.setupFee} + ${partner.contract.pricePerActivePet}/activa ${partner.contract.currency}`);

  line('1) Métricas agregadas (panel partner_admin)');
  const metrics = await MetricsService.computeMetrics(partner, month);
  console.log(j(metrics));

  line('2) Facturación del mes (setupFee una vez + activas * precio)');
  const record = await MeteringService.generateBillingRecord(partner, month);
  console.log(`total=${record.total} ${record.currency}  (setupFee ${record.setupFeeApplied} + ${record.activePets} activas x ${record.pricePerActivePet})  status=${record.status}`);

  line('3) Cobro automático al partner (autoCharge on)');
  const charge = await ChargeService.chargeBillingRecord(record, partner);
  console.log('resultado:', j(charge), '| status factura:', record.status, '| error:', record.chargeError || '—');
  console.log('(sin MERCADOPAGO_ACCESS_TOKEN el cobro falla de forma controlada; con token de sandbox → paid)');

  line('4) Certificado de Luna (atestada por clínica → certified)');
  const cert = await CertificateService.issue(luna, ana);
  console.log(`nivel=${cert.confidenceLevel} | certifiedBy=${cert.certifiedBy} | score=${cert.scoreSnapshot.score} | validUntil=${cert.validUntil?.toISOString().slice(0,10)}`);
  line('   Vista que recibe la ASEGURADORA (sin score ni clínica detallada)');
  console.log(j(CertificateService.shareableView(cert)));

  line('5) Consentimiento para compartir con el partner');
  const consented = await ConsentService.hasConsent(luna._id, 'share_certificate_with_partner', partner._id);
  console.log('hasConsent =', consented);

  line('6) ¿Lo cubre mi póliza? (informativo, no vinculante)');
  const policy = await InsurancePolicy.findOne({ dogId: luna._id });
  for (const ev of ['accidente', 'cirugia', 'odontologia']) {
    const r = CoverageService.checkCoverage(policy, ev);
    console.log(`  ${ev.padEnd(12)} → likelyCovered=${r.likelyCovered} | ${r.message}`);
  }

  line('7) Claims Assistant v0 (borrador desde el historial de Toby)');
  const draft = ClaimsService.buildDraft(toby, { type: 'accident' });
  console.log(`eventos enlazados: ${draft.linkedEvents.length}`);
  console.log(draft.generatedSummary);

  line('8) Webhook saliente al partner (compartir certificado)');
  const wh = await WebhookService.deliver(partner.webhookUrl, { event: 'certificate.shared', dogId: String(luna._id), ...CertificateService.shareableView(cert) });
  console.log('entrega:', j(wh));

  console.log('\n✅ Verificación completa.');
  await mongoose.disconnect();
}

main().catch((err) => { console.error('[verify] failed:', err); mongoose.disconnect(); process.exit(1); });
