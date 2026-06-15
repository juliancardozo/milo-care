'use strict';

require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { startReminderJob } = require('./services/ReminderJob');
const { startCheckinJob } = require('./services/CheckinJob');
const { startTriggeredCampaignsJob } = require('./services/TriggeredCampaignsJob');

const PORT = process.env.PORT || 3001;

async function main() {
  await connectDB();
  startReminderJob();
  startCheckinJob();
  startTriggeredCampaignsJob();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();
