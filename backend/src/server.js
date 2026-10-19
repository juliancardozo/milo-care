'use strict';

require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { startReminderJob } = require('./services/ReminderJob');
const { startCheckinJob } = require('./services/CheckinJob');
const { startTriggeredCampaignsJob } = require('./services/TriggeredCampaignsJob');
const { startMeteringJob } = require('./services/MeteringJob');
const { startDailySummaryJob } = require('./services/DailySummaryJob');
const SlackService = require('./services/SlackService');

const PORT = process.env.PORT || 3001;

async function main() {
  await connectDB();
  startReminderJob();
  startCheckinJob();
  startTriggeredCampaignsJob();
  startMeteringJob(); // B2B2C: facturación mensual (no-op si companionEnabled está off)
  SlackService.init(); // loguea (una vez) si las notificaciones a Slack están activas
  startDailySummaryJob(); // resumen diario 09:00 ART (no-op si Slack está deshabilitado)
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();
