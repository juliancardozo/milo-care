'use strict';

const BREEDS = [
  { name: 'Labrador Retriever', size: 'large', weightMin: 25, weightMax: 36 },
  { name: 'Mixed', size: 'medium', weightMin: 10, weightMax: 35 },
  { name: 'German Shepherd', size: 'large', weightMin: 22, weightMax: 40 },
  { name: 'French Bulldog', size: 'small', weightMin: 8, weightMax: 14 },
  { name: 'Poodle', size: 'medium', weightMin: 15, weightMax: 25 },
  { name: 'Border Collie', size: 'medium', weightMin: 14, weightMax: 20 },
  { name: 'Golden Retriever', size: 'large', weightMin: 25, weightMax: 34 },
  { name: 'Dachshund', size: 'small', weightMin: 5, weightMax: 12 },
  { name: 'Beagle', size: 'small', weightMin: 9, weightMax: 14 },
  { name: 'Caniche', size: 'medium', weightMin: 10, weightMax: 25 },
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function searchBreed(query) {
  const term = normalize(query);
  if (!term) return [];

  return BREEDS.filter((breed) => normalize(breed.name).includes(term)).slice(0, 5);
}

function getBreed(query) {
  const exact = BREEDS.find((breed) => normalize(breed.name) === normalize(query));
  if (exact) return exact;

  const fuzzy = searchBreed(query);
  return fuzzy[0] || null;
}

function getBreedSize(breedName) {
  const breed = getBreed(breedName);
  return breed ? breed.size : 'medium';
}

function validateBreedWeight(breedName, weightKg) {
  const breed = getBreed(breedName);
  if (!breed || weightKg === null || weightKg === undefined) {
    return { valid: true, warning: null, suggestedSize: breed ? breed.size : 'medium' };
  }

  const valid = weightKg >= breed.weightMin && weightKg <= breed.weightMax;
  return {
    valid,
    warning: valid
      ? null
      : `The weight is outside the typical range for ${breed.name}. A veterinarian should confirm the final size and health assessment.`,
    suggestedSize: breed.size,
  };
}

module.exports = {
  BREEDS,
  searchBreed,
  getBreed,
  getBreedSize,
  validateBreedWeight,
};
