'use strict';

// Tests puros de agregación de check-ins (tendencias, patrones, racha).

const {
  computeStreak,
  detectPatterns,
  countsForWindow,
} = require('../../src/services/checkinAnalytics');

describe('computeStreak', () => {
  test('días consecutivos terminando hoy', () => {
    const dates = ['2026-06-12', '2026-06-11', '2026-06-10'];
    expect(computeStreak(dates, '2026-06-12')).toBe(3);
  });

  test('si hoy no respondió pero ayer sí, la racha sigue viva', () => {
    const dates = ['2026-06-11', '2026-06-10'];
    expect(computeStreak(dates, '2026-06-12')).toBe(2);
  });

  test('un hueco corta la racha', () => {
    const dates = ['2026-06-12', '2026-06-10', '2026-06-09'];
    expect(computeStreak(dates, '2026-06-12')).toBe(1);
  });

  test('sin check-ins recientes → 0', () => {
    expect(computeStreak(['2026-06-01'], '2026-06-12')).toBe(0);
  });
});

describe('detectPatterns', () => {
  test('≥2 respuestas negativas consecutivas en una categoría → patrón', () => {
    const checkins = [
      { question: 'comida', answer: 'mal', localDate: '2026-06-12' },
      { question: 'comida', answer: 'regular', localDate: '2026-06-11' },
      { question: 'comida', answer: 'bien', localDate: '2026-06-09' },
    ];
    const patterns = detectPatterns(checkins);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({ category: 'comida', run: 2 });
  });

  test('una respuesta positiva reciente rompe la racha trailing', () => {
    const checkins = [
      { question: 'comida', answer: 'bien', localDate: '2026-06-12' },
      { question: 'comida', answer: 'mal', localDate: '2026-06-11' },
      { question: 'comida', answer: 'mal', localDate: '2026-06-10' },
    ];
    expect(detectPatterns(checkins)).toHaveLength(0);
  });

  test('una sola negativa no alcanza el umbral', () => {
    const checkins = [{ question: 'energia', answer: 'mal', localDate: '2026-06-12' }];
    expect(detectPatterns(checkins)).toHaveLength(0);
  });
});

describe('countsForWindow', () => {
  test('cuenta por categoría dentro de la ventana', () => {
    const checkins = [
      { question: 'comida', answer: 'bien', localDate: '2026-06-12' },
      { question: 'comida', answer: 'mal', localDate: '2026-06-11' },
      { question: 'energia', answer: 'regular', localDate: '2026-06-10' },
      { question: 'comida', answer: 'bien', localDate: '2026-05-01' }, // fuera de ventana 7d
    ];
    const counts = countsForWindow(checkins, '2026-06-12', 7);
    expect(counts.comida).toMatchObject({ bien: 1, mal: 1, total: 2 });
    expect(counts.energia).toMatchObject({ regular: 1, total: 1 });
  });
});
