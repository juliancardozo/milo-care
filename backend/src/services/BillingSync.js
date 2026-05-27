'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const BillingService = require('./BillingService');

async function processPendingSubscriptions() {
  const users = await User.find({
    billingSubscriptionStatus: { $in: ['pending', 'past_due'] },
    billingSubscriptionId: { $ne: null },
  });

  if (users.length === 0) return;

  console.log(`[BillingSync] Syncing ${users.length} subscription(s)...`);

  for (const user of users) {
    try {
      await BillingService.syncUserTier(user);
    } catch (err) {
      console.error(`[BillingSync] Failed to sync user ${user._id}: ${err.message}`);
    }
  }
}

function startBillingSync() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    processPendingSubscriptions().catch((err) =>
      console.error('[BillingSync] Unexpected error:', err.message)
    );
  });
  console.log('[BillingSync] Hourly sync scheduled.');
}

module.exports = { startBillingSync };
