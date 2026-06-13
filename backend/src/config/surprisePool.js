'use strict';

/**
 * Pool de sorpresas de marca (Fase 4) — editable sin tocar lógica.
 *
 * "Milo encontró algo enterrado 🦴": al completar el check-in, ocasionalmente
 * (probabilidad configurable) aparece una sorpresa. La probabilidad se lee de
 * SURPRISE_PROBABILITY (env). El pool y los datos viven acá.
 */

// Datos curiosos por raza (match por substring, lowercase). Fallback genérico.
const breedFacts = [
  { match: ['border collie', 'collie'], fact: 'El Border Collie es considerado la raza más inteligente: entiende cientos de palabras.' },
  { match: ['labrador'], fact: 'Los Labradores tienen membranas entre los dedos que los hacen nadadores natos.' },
  { match: ['bulldog', 'pug', 'boxer'], fact: 'Las razas braquicéfalas regulan el calor por el jadeo: cuidalas en verano.' },
  { match: ['caniche', 'poodle'], fact: 'El Caniche fue criado como perro de agua: su pelo rizado lo aislaba del frío.' },
  { match: ['salchicha', 'dachshund'], fact: 'El Dachshund fue criado para cazar tejones en sus madrigueras. ¡Por eso es alargado!' },
  { match: ['golden'], fact: 'El Golden Retriever fue desarrollado en Escocia para recuperar presas sin dañarlas.' },
];

const GENERIC_FACTS = [
  'El olfato de un perro es hasta 100.000 veces más sensible que el humano.',
  'Los perros sueñan: mueven las patas y "corren" mientras duermen.',
  'La nariz de cada perro es única, como una huella digital.',
];

// Stickers descargables para el Álbum (ids que el frontend mapea a una imagen).
const stickers = ['hueso-dorado', 'corazon-patita', 'medalla-buen-perro', 'estrella-milo'];

// Composición del pool con pesos relativos.
const pool = [
  { type: 'breed_fact', weight: 5 },
  { type: 'sticker', weight: 3 },
  { type: 'boosted_referral', weight: 2 },
];

function factForBreed(breed = '') {
  const b = String(breed).toLowerCase();
  const hit = breedFacts.find((f) => f.match.some((m) => b.includes(m)));
  return hit ? hit.fact : GENERIC_FACTS[Math.floor(Math.random() * GENERIC_FACTS.length)];
}

module.exports = { pool, stickers, factForBreed, GENERIC_FACTS };
