'use strict';

const { TierLimitError } = require('../middleware/errorHandler');

const FREE_TIER_DOG_LIMIT = 1;

const TierService = {
  /**
   * Throws TierLimitError if a free-tier user has reached their dog limit.
   * @param {object} user - Mongoose user document
   */
  assertCanAddDog(user) {
    if (user.tier === 'free' && user.dogs.length >= FREE_TIER_DOG_LIMIT) {
      throw new TierLimitError(
        'Free accounts are limited to 1 dog profile. Upgrade to premium for unlimited profiles.'
      );
    }
  },
};

module.exports = TierService;
