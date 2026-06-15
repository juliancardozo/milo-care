'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const User = require('../models/User');
const DailyCheckin = require('../models/DailyCheckin');
const EmailService = require('../services/EmailService');
const analytics = require('../services/analyticsService');
const { questionForDate } = require('../services/checkinQuestionService');
const { computeTrends, computeStreak } = require('../services/checkinAnalytics');
const { verifyResponseToken } = require('../services/checkinTokenService');
const referralService = require('../services/referralService');
const notificationTracking = require('../services/notificationTracking');
const { localDateString, addDaysToLocalDate } = require('../utils/localTime');

const { ANSWERS } = DailyCheckin;

// ── Helpers ──────────────────────────────────────────────────────────────────

function userTimezone(user) {
  return user?.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
}

async function recentForDog(dogId, todayLocalDate, days = 7) {
  const since = addDaysToLocalDate(todayLocalDate, -days);
  return DailyCheckin.find({ dogId, localDate: { $gte: since } })
    .sort({ localDate: 1 })
    .lean();
}

// Página HTML mínima y cálida para la confirmación desde el email.
function confirmationPage({ title, message, emoji = '🐾', tone = 'ok' }) {
  const accent = tone === 'ok' ? '#22c55e' : tone === 'warn' ? '#f59e0b' : '#ef4444';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f9fafb;color:#1a1a2e;}
  .wrap{max-width:480px;margin:0 auto;padding:64px 24px;text-align:center;}
  .card{background:#fff;border:1px solid #e5e7eb;border-top:5px solid ${accent};border-radius:16px;padding:40px 28px;}
  .emoji{font-size:56px;line-height:1;}
  h1{font-size:22px;margin:18px 0 10px;}
  p{color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;}
  a.btn{display:inline-block;background:#4f8ef7;color:#fff;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:9px;}
</style></head>
<body><div class="wrap"><div class="card">
  <div class="emoji">${emoji}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a class="btn" href="${appUrl}">Abrir Milo Care</a>
</div></div></body></html>`;
}

// ── Router dog-scoped: /api/dogs/:dogId/checkins ──────────────────────────────

const dogCheckinsRouter = express.Router({ mergeParams: true });

// GET /today — pregunta del día + si ya respondió (para la card del dashboard)
dogCheckinsRouter.get('/today', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const tz = userTimezone(user);
    const localDate = localDateString(tz);
    const recent = await recentForDog(dog._id, localDate);
    const today = recent.find((c) => c.localDate === localDate) || null;
    const { question, focus, specialized } = questionForDate(dog, localDate, recent);

    return res.json({
      localDate,
      question: today ? today.question : question,
      focus: today ? null : focus,
      specialized: today ? false : specialized,
      answered: Boolean(today),
      checkin: today,
    });
  } catch (err) {
    next(err);
  }
});

// GET / — historial (?from=&to= en localDate YYYY-MM-DD)
dogCheckinsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { dog } = found;

    const query = { dogId: dog._id };
    const { from, to } = req.query;
    if (from || to) {
      query.localDate = {};
      if (from) query.localDate.$gte = String(from);
      if (to) query.localDate.$lte = String(to);
    }

    const checkins = await DailyCheckin.find(query).sort({ localDate: -1 }).lean();
    return res.json({ checkins });
  } catch (err) {
    next(err);
  }
});

// POST / — respuesta desde la app
dogCheckinsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const { answer, note } = req.body;
    if (!ANSWERS.includes(answer)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: `answer must be one of: ${ANSWERS.join(', ')}.` });
    }

    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const tz = userTimezone(user);
    const localDate = localDateString(tz);
    const recent = await recentForDog(dog._id, localDate);
    const { question } = questionForDate(dog, localDate, recent);

    try {
      const checkin = await DailyCheckin.create({
        userId: user._id,
        dogId: dog._id,
        localDate,
        question,
        answer,
        note: note ? String(note).slice(0, 500) : '',
        channel: 'app',
      });

      analytics.track('checkin_answered', { userId: user._id, dogId: dog._id, channel: 'app', meta: { question, answer } });
      analytics.track('checkin_streak_day', { userId: user._id, dogId: dog._id, channel: 'app' });

      // Conversion tracking (Fase 4): responder el check-in cierra el embudo del
      // nudge de re-engagement. Fire-and-forget.
      notificationTracking.recordConversion(user._id, dog._id, ['reengagement']);

      // Activa un referido pendiente en el primer check-in (idempotente, no bloquea).
      referralService.activateForReferredUser(user).catch((err) => console.error('[checkins] referral activation failed:', err.message));

      return res.status(201).json(checkin);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ code: 'CHECKIN_ALREADY_EXISTS', message: 'Ya registraste el check-in de hoy para este perro.' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// GET /trends — agregación 7/30 días + patrones
dogCheckinsRouter.get('/trends', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const tz = userTimezone(user);
    const localDate = localDateString(tz);
    const since = addDaysToLocalDate(localDate, -30);
    const checkins = await DailyCheckin.find({ dogId: dog._id, localDate: { $gte: since } })
      .sort({ localDate: 1 })
      .lean();

    return res.json({ localDate, trends: computeTrends(checkins, localDate) });
  } catch (err) {
    next(err);
  }
});

// GET /streak — racha de cuidado
dogCheckinsRouter.get('/streak', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const tz = userTimezone(user);
    const localDate = localDateString(tz);
    const docs = await DailyCheckin.find({ dogId: dog._id }).select('localDate').lean();
    const streak = computeStreak(docs.map((d) => d.localDate), localDate);

    return res.json({ streak, localDate });
  } catch (err) {
    next(err);
  }
});

// ── Router público: /api/checkins ─────────────────────────────────────────────

const publicCheckinsRouter = express.Router();

// GET /respond?token= — respuesta desde el email (sin login)
publicCheckinsRouter.get('/respond', async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  let payload;
  try {
    payload = verifyResponseToken(String(req.query.token || ''));
  } catch {
    return res.status(400).send(confirmationPage({
      title: 'Enlace vencido',
      message: 'Este enlace ya no es válido o expiró. Podés responder el check-in de hoy directamente desde la app.',
      emoji: '⏳',
      tone: 'warn',
    }));
  }

  try {
    const user = await User.findById(payload.userId);
    const dog = user?.dogs.id(payload.dogId);
    if (!dog) {
      return res.status(404).send(confirmationPage({
        title: 'No encontramos a tu perro',
        message: 'Puede que el perfil haya cambiado. Ingresá a la app para continuar.',
        emoji: '🐶',
        tone: 'warn',
      }));
    }

    const answerMeta = EmailService._checkinCopy.answers[payload.answer];
    try {
      await DailyCheckin.create({
        userId: user._id,
        dogId: dog._id,
        localDate: payload.localDate,
        question: payload.question,
        answer: payload.answer,
        channel: 'email',
      });

      analytics.track('checkin_answered', { userId: user._id, dogId: dog._id, channel: 'email', meta: { question: payload.question, answer: payload.answer } });
      notificationTracking.recordConversion(user._id, dog._id, ['reengagement']);
      analytics.track('checkin_streak_day', { userId: user._id, dogId: dog._id, channel: 'email' });

      // Activa un referido pendiente en el primer check-in (idempotente, no bloquea).
      referralService.activateForReferredUser(user).catch((err) => console.error('[checkins] referral activation failed:', err.message));

      return res.status(200).send(confirmationPage({
        title: `¡Gracias por cuidar a ${dog.name}! 🐾`,
        message: `Registramos que ${dog.name} hoy está <strong>${answerMeta.label}</strong>. Cada check-in ayuda a seguir su bienestar día a día.`,
        emoji: '💚',
        tone: payload.answer === 'mal' ? 'bad' : payload.answer === 'regular' ? 'warn' : 'ok',
      }));
    } catch (err) {
      if (err.code === 11000) {
        // Single-use: el día ya fue respondido (reuso de token o doble click).
        return res.status(200).send(confirmationPage({
          title: 'Ya tenías el check-in de hoy ✅',
          message: `Hoy ya nos contaste cómo está ${dog.name}. ¡Nos vemos mañana! 🐾`,
          emoji: '🐾',
          tone: 'ok',
        }));
      }
      throw err;
    }
  } catch (err) {
    console.error('[checkins/respond] error:', err.message);
    return res.status(500).send(confirmationPage({
      title: 'Algo salió mal',
      message: 'No pudimos registrar tu respuesta. Probá de nuevo desde la app.',
      emoji: '😅',
      tone: 'bad',
    }));
  }
});

module.exports = { dogCheckinsRouter, publicCheckinsRouter };
