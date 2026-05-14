'use strict';

const { ValidationError } = require('./errorHandler');
const { validateStep } = require('../services/ValidationService');

function validateOnboardingStep(req, _res, next) {
  const { stepKey } = req.params;
  const result = validateStep(stepKey, req.body || {});

  if (!result.valid) {
    return next(new ValidationError('Onboarding step validation failed.', result.errors));
  }

  req.onboardingValidation = result;
  return next();
}

module.exports = validateOnboardingStep;
