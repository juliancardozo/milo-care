'use strict';

const SEVERE_SYMPTOMS = ['seizures', 'respiratory_distress', 'collapse', 'bloody_vomit', 'bloody_diarrhea'];

function normalizeSymptoms(input = {}) {
  return {
    hasVomiting: Boolean(input.hasVomiting),
    hasDiarrhea: Boolean(input.hasDiarrhea),
    hasCough: Boolean(input.hasCough),
    hasSeizures: Boolean(input.hasSeizures),
    hasDermatitis: Boolean(input.hasDermatitis),
    hasLimping: Boolean(input.hasLimping),
    hasAppetiteLoss: Boolean(input.hasAppetiteLoss),
    hasBreathingDifficulty: Boolean(input.hasBreathingDifficulty),
    otherSymptoms: input.otherSymptoms || '',
  };
}

function detectSevereSymptoms(symptoms = {}) {
  const normalized = normalizeSymptoms(symptoms);
  const findings = [];

  if (normalized.hasSeizures) findings.push('seizures');
  if (normalized.hasBreathingDifficulty) findings.push('respiratory_distress');
  if (normalized.hasVomiting && normalized.hasDiarrhea) findings.push('gastrointestinal_cluster');
  if (normalized.hasAppetiteLoss && normalized.hasLimping) findings.push('mobility_and_appetite');

  const hasSevere = findings.some((item) => SEVERE_SYMPTOMS.includes(item)) || normalized.hasSeizures || normalized.hasBreathingDifficulty;

  return {
    hasSevere,
    findings,
    symptoms: normalized,
    message: hasSevere
      ? 'This looks like an urgent veterinary situation. The onboarding flow should pause until a veterinarian is consulted.'
      : 'No urgent red flags detected.',
  };
}

function shouldBlockOnboarding(dog, clinicalHistory = {}) {
  const result = detectSevereSymptoms(clinicalHistory.recentSymptoms || clinicalHistory.symptoms || {});
  return result.hasSevere || !dog?.name || !dog?.breed;
}

function generateEmergencyAlert() {
  return {
    title: 'Emergency alert',
    message: 'Please contact a veterinarian or emergency clinic immediately if severe symptoms are present.',
    contacts: [
      { label: 'Veterinarian', value: 'Your trusted veterinarian' },
      { label: 'Emergency clinic', value: '24h veterinary emergency clinic' },
    ],
  };
}

module.exports = {
  detectSevereSymptoms,
  shouldBlockOnboarding,
  generateEmergencyAlert,
};
