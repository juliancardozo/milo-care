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
  // Every 5 min: sync users who just subscribed (pending) — catches MP confirmation fast
  cron.schedule('*/5 * * * *', () => {
    User.find({ billingSubscriptionStatus: 'pending', billingSubscriptionId: { $ne: null } })
      .then((users) => {
        if (users.length === 0) return;
        console.log(`[BillingSync] Fast-sync ${users.length} pending subscription(s)`);
        return Promise.all(users.map((u) => BillingService.syncUserTier(u).catch((err) =>
          console.error(`[BillingSync] Failed to sync user ${u._id}: ${err.message}`)
        )));
      })
      .catch((err) => console.error('[BillingSync] Fast-sync error:', err.message));
  });

  // Hourly: catch past_due and any pending missed by the fast cron
  cron.schedule('0 * * * *', () => {
    processPendingSubscriptions().catch((err) =>
      console.error('[BillingSync] Unexpected error:', err.message)
    );
  });
  console.log('[BillingSync] Sync scheduled (5-min for pending, hourly for all).');
}

module.exports = { startBillingSync };
