'use strict';

/**
 * Reglas de alertas locales estacionales (Fase 5) — editable sin tocar lógica.
 *
 * Hemisferio sur: la temporada alta de parásitos externos y de calor cae en
 * primavera-verano. Los meses se expresan 1–12. Las alertas son informativas
 * (señal preventiva), nunca diagnóstico, y se modulan por país/región.
 */

const rules = {
  // Garrapatas y pulgas: ajustar/adelantar el antiparasitario externo.
  tick: {
    monthsByCountry: {
      AR: [9, 10, 11, 12, 1, 2, 3],
      UY: [10, 11, 12, 1, 2, 3, 4],
    },
    emoji: '🕷️',
    title: 'Temporada de garrapatas y pulgas',
    message:
      'En {zone} arranca la temporada alta de garrapatas y pulgas. Es buen momento para revisar el antiparasitario externo de {dogs} y reforzar la prevención.',
    cta: 'Revisar antiparasitarios',
  },
  // Golpe de calor: especialmente crítico en razas braquicéfalas.
  heat: {
    monthsByCountry: {
      AR: [12, 1, 2],
      UY: [12, 1, 2],
    },
    brachycephalicOnly: true,
    emoji: '🌡️',
    title: 'Calor fuerte: cuidado con el golpe de calor',
    message:
      'Llega el calor a {zone}. Las razas de hocico corto como {dogs} regulan peor la temperatura: evitá el ejercicio en las horas pico y asegurá agua fresca y sombra.',
    cta: 'Ver señales de alerta',
  },
};

module.exports = { rules };
