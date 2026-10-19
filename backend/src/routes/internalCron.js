'use strict';

/**
 * Cron externo: POST /api/internal/cron/:job
 *
 * Render free duerme el proceso tras ~15 min sin tráfico, y mientras duerme los
 * node-cron in-process no corren. Un scheduler externo (GitHub Actions,
 * .github/workflows/cron.yml) llama a este endpoint para despertar el servicio y
 * disparar el job.
 *
 * Seguridad:
 *   - Si CRON_SECRET no está seteado, el endpoint no existe (404).
 *   - El secreto viaja en el header `X-Cron-Secret` y se compara en tiempo
 *     constante (sha256 de ambos lados + crypto.timingSafeEqual).
 *
 * Respuesta rápida: el job corre en background (202). Si ya hay una corrida del
 * mismo job en curso (in-process o externa), responde 200 `already_running`.
 */

const crypto = require('crypto');
const express = require('express');
const featureFlags = require('../config/featureFlags');
const { runExclusive } = require('../services/jobLock');
const { runReminders } = require('../services/ReminderJob');
const { runCheckins } = require('../services/CheckinJob');
const { runTriggeredCampaigns } = require('../services/TriggeredCampaignsJob');
const { runMetering } = require('../services/MeteringJob');

// Los flags se leen en cada request (mismo criterio que los start*Job de server.js).
const JOBS = {
  reminders: { run: () => runReminders(), enabled: () => true },
  checkins: { run: () => runCheckins(new Date()), enabled: () => featureFlags.checkinEnabled },
  campaigns: { run: () => runTriggeredCampaigns(new Date()), enabled: () => true },
  metering: { run: () => runMetering(new Date()), enabled: () => featureFlags.companionEnabled },
};

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function secretMatches(provided, expected) {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  // Hashear iguala longitudes → timingSafeEqual no filtra el largo del secreto.
  return crypto.timingSafeEqual(sha256(provided), sha256(expected));
}

const router = express.Router();

router.post('/:job', (req, res) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found.' });
  }
  if (!secretMatches(req.get('x-cron-secret'), expected)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid cron secret.' });
  }

  const name = req.params.job;
  const job = Object.prototype.hasOwnProperty.call(JOBS, name) ? JOBS[name] : null;
  if (!job) {
    return res.status(404).json({ code: 'UNKNOWN_JOB', message: `Unknown job: ${name}` });
  }
  if (!job.enabled()) {
    return res.status(200).json({ job: name, status: 'disabled' });
  }

  const { started } = runExclusive(name, job.run);
  if (!started) {
    return res.status(200).json({ job: name, status: 'already_running' });
  }
  console.log(`[cron] external trigger: ${name}`);
  return res.status(202).json({ job: name, status: 'started' });
});

module.exports = router;
module.exports.JOBS = JOBS;
