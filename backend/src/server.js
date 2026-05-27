'use strict';

require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { startReminderJob } = require('./services/ReminderJob');
const { startBillingSync } = require('./services/BillingSync');

const PORT = process.env.PORT || 3001;

async function main() {
  await connectDB();
  startReminderJob();
  startBillingSync();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main();
