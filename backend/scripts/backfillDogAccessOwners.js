'use strict';

/**
 * backfillDogAccessOwners.js
 *
 * Crea un DogAccess { role:'owner', status:'active' } por cada perro embebido
 * en User, de forma idempotente (no duplica si ya existe).
 *
 * Uso:
 *   node scripts/backfillDogAccessOwners.js           # dry-run (no persiste)
 *   node scripts/backfillDogAccessOwners.js --write   # persistencia real
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const DogAccess = require('../src/models/DogAccess');

const DRY_RUN = !process.argv.includes('--write');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milocura');
  console.log(`[backfill] DRY_RUN=${DRY_RUN}. Pass --write to persist.`);

  const users = await User.find({}, 'dogs').lean();
  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const user of users) {
    for (const dog of user.dogs || []) {
      try {
        const existing = await DogAccess.findOne({
          dogId: dog._id,
          memberUserId: user._id,
          role: 'owner',
        }).lean();

        if (existing) {
          skipped++;
          continue;
        }

        if (!DRY_RUN) {
          await DogAccess.create({
            dogId: dog._id,
            ownerUserId: user._id,
            memberUserId: user._id,
            role: 'owner',
            status: 'active',
          });
        }

        created++;
      } catch (err) {
        console.error(`[backfill] error userId=${user._id} dogId=${dog._id}:`, err.message);
        errors++;
      }
    }
  }

  console.log(`[backfill] DONE — created=${created} skipped=${skipped} errors=${errors}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
