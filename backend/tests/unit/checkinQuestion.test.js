'use strict';

// Tests puros del servicio de selección de la pregunta del check-in diario.

const {
  questionForDate,
  baseQuestionForDate,
} = require('../../src/services/checkinQuestionService');
const { QUESTIONS } = require('../../src/models/DailyCheckin');

describe('checkinQuestionService — rotación determinística', () => {
  test('misma fecha devuelve siempre la misma pregunta', () => {
    expect(baseQuestionForDate('2026-06-12')).toBe(baseQuestionForDate('2026-06-12'));
  });

  test('cubre las 5 categorías en 5 días consecutivos', () => {
    const dates = ['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14'];
    const seen = new Set(dates.map((d) => baseQuestionForDate(d)));
    expect(seen.size).toBe(QUESTIONS.length);
  });

  test('toda ventana de 7 días corridos cubre todas las categorías', () => {
    const base = new Date(Date.UTC(2026, 0, 1));
    for (let start = 0; start < 30; start++) {
      const seen = new Set();
      for (let i = 0; i < 7; i++) {
        const d = new Date(base.getTime() + (start + i) * 86400000).toISOString().slice(0, 10);
        seen.add(baseQuestionForDate(d));
      }
      expect(seen.size).toBe(QUESTIONS.length);
    }
  });
});

describe('checkinQuestionService — especialización por raza', () => {
  const bulldog = { breed: 'Bulldog Francés', lifestyle: {} };

  test('braquicéfalo + 2 respuestas de energía negativas recientes → foco respiratorio', () => {
    const recent = [
      { question: 'energia', answer: 'mal', localDate: '2026-06-11' },
      { question: 'energia', answer: 'regular', localDate: '2026-06-10' },
    ];
    const result = questionForDate(bulldog, '2026-06-12', recent);
    expect(result.specialized).toBe(true);
    expect(result.question).toBe('energia');
    expect(result.focus).toBe('respiratory');
  });

  test('una sola respuesta negativa no especializa (umbral = 2)', () => {
    const recent = [{ question: 'energia', answer: 'mal', localDate: '2026-06-11' }];
    const result = questionForDate(bulldog, '2026-06-12', recent);
    expect(result.specialized).toBe(false);
  });

  test('respuestas negativas viejas (fuera de la ventana) no especializan', () => {
    const recent = [
      { question: 'energia', answer: 'mal', localDate: '2026-06-01' },
      { question: 'energia', answer: 'mal', localDate: '2026-06-02' },
    ];
    const result = questionForDate(bulldog, '2026-06-12', recent);
    expect(result.specialized).toBe(false);
  });

  test('raza sin regla de riesgo no especializa aunque haya negativas', () => {
    const mutt = { breed: 'Mestizo', lifestyle: {} };
    const recent = [
      { question: 'energia', answer: 'mal', localDate: '2026-06-11' },
      { question: 'energia', answer: 'mal', localDate: '2026-06-10' },
    ];
    const result = questionForDate(mutt, '2026-06-12', recent);
    expect(result.specialized).toBe(false);
  });
});
