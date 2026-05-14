'use strict';

const { thresholds, dewormingCadenceDays } = require('../config/riskProfiles');

function calculateScore(lifestyle = {}) {
  const factors = [];
  let score = 0;

  if (!lifestyle.livesIndoors) {
    score += 1;
    factors.push('outdoor_exposure');
  }
  if (lifestyle.dogParkAttendance) {
    score += 2;
    factors.push('dog_park');
  }
  if (lifestyle.daycare) {
    score += 2;
    factors.push('daycare');
  }
  if (lifestyle.ruralOrVisitsRural) {
    score += 2;
    factors.push('rural_exposure');
  }
  if (lifestyle.rawDiet) {
    score += 2;
    factors.push('raw_diet');
  }
  if (lifestyle.contactWithRodents) {
    score += 2;
    factors.push('rodent_contact');
  }
  if (lifestyle.standsWater) {
    score += 1;
    factors.push('standing_water');
  }
  if (lifestyle.cohabitsWithDogs) {
    score += 1;
    factors.push('multi_dog_home');
  }
  if (lifestyle.groomer) {
    score += 1;
    factors.push('shared_facilities');
  }

  return { score, factors };
}

function scoreToLevel(score) {
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

function calculate(lifestyle = {}) {
  const { score, factors } = calculateScore(lifestyle);
  const level = scoreToLevel(score);
  return {
    level,
    score,
    factors,
    dewormingCadenceDays: dewormingCadenceDays[level],
  };
}

function updateRecommendations(riskProfile) {
  const level = riskProfile?.level || 'low';
  return {
    level,
    dewormingCadenceDays: dewormingCadenceDays[level] || dewormingCadenceDays.low,
    vetValidationRequired: level === 'high',
  };
}

module.exports = {
  calculate,
  calculateScore,
  scoreToLevel,
  updateRecommendations,
};
