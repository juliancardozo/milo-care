'use strict';

const jwt = require('jsonwebtoken');
const { ANSWERS } = require('../models/DailyCheckin');

/**
 * Tokens firmados para responder el check-in diario desde el email sin loguearse.
 *
 * Cada botón de respuesta del email (bien/regular/mal) es un link con su propio
 * token firmado (HMAC con JWT_SECRET) que codifica la respuesta — así el valor no
 * es manipulable vía query string. Expira en 24h.
 *
 * El "un solo uso" no se lleva como estado del token, sino que lo garantiza el
 * índice único { dogId, localDate } de DailyCheckin: una vez registrado el
 * check-in del día, cualquier reuso del token (de la misma o de otra respuesta)
 * encuentra el día ya respondido. Así cubrimos reuso y expiración sin colección
 * extra de tokens.
 */

const TOKEN_TYPE = 'checkin_response';
const TTL = '24h';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set.');
  return s;
}

/**
 * Genera un token firmado para una respuesta concreta.
 */
function generateResponseToken({ userId, dogId, localDate, question, answer, focus = null }) {
  if (!ANSWERS.includes(answer)) {
    throw new Error(`Invalid answer "${answer}".`);
  }
  return jwt.sign(
    {
      t: TOKEN_TYPE,
      uid: String(userId),
      did: String(dogId),
      date: localDate,
      q: question,
      a: answer,
      f: focus,
    },
    secret(),
    { expiresIn: TTL }
  );
}

/**
 * Genera los 3 tokens (uno por respuesta) para una pregunta del día.
 * @returns {{ bien: string, regular: string, mal: string }}
 */
function generateResponseTokens(params) {
  return ANSWERS.reduce((acc, answer) => {
    acc[answer] = generateResponseToken({ ...params, answer });
    return acc;
  }, {});
}

/**
 * Verifica un token de respuesta. Lanza si es inválido/expirado.
 * @returns {{ userId, dogId, localDate, question, answer, focus }}
 */
function verifyResponseToken(token) {
  const payload = jwt.verify(token, secret());
  if (payload.t !== TOKEN_TYPE) {
    const err = new Error('Wrong token type.');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  if (!ANSWERS.includes(payload.a)) {
    const err = new Error('Invalid answer in token.');
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return {
    userId: payload.uid,
    dogId: payload.did,
    localDate: payload.date,
    question: payload.q,
    answer: payload.a,
    focus: payload.f || null,
  };
}

module.exports = {
  generateResponseToken,
  generateResponseTokens,
  verifyResponseToken,
  TOKEN_TYPE,
};
