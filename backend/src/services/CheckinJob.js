'use strict';

const cron = require('node-cron');
const User = require('../models/User');
const DailyCheckin = require('../models/DailyCheckin');
const EmailService = require('./EmailService');
const pushService = require('./pushService');
const analytics = require('./analyticsService');
const featureFlags = require('../config/featureFlags');
const { localDateString, localHour, addDaysToLocalDate } = require('../utils/localTime');
const { questionForDate } = require('./checkinQuestionService');
const { generateResponseTokens } = require('./checkinTokenService');
const { getActiveLocalAlerts } = require('./localAlertsService');

const API_URL = () => process.env.API_URL || 'http://localhost:3001';

function respondUrl(token) {
  return `${API_URL()}/api/checkins/respond?token=${encodeURIComponent(token)}`;
}

/**
 * Arma la sección de un perro para el email del día, o null si ya respondió hoy
 * o si el perro no es apto. `recentByDog` mapea dogId → array de check-ins recientes.
 */
function buildDogSection(user, dog, localDate, recentByDog) {
  const dogId = String(dog._id);
  const recent = recentByDog.get(dogId) || [];

  // Si ya hay check-in de hoy, no volvemos a preguntar.
  if (recent.some((c) => c.localDate === localDate)) return null;

  const { question, focus } = questionForDate(dog, localDate, recent);
  const tokens = generateResponseTokens({
    userId: user._id,
    dogId: dog._id,
    localDate,
    question,
    focus,
  });

  return {
    dogId,
    dogName: dog.name,
    question,
    focus,
    urls: {
      bien: respondUrl(tokens.bien),
      regular: respondUrl(tokens.regular),
      mal: respondUrl(tokens.mal),
    },
  };
}

/**
 * Procesa y despacha los check-ins diarios.
 * @param {Date} now - instante de referencia (los tests lo inyectan)
 */
async function runCheckins(now = new Date()) {
  if (!featureFlags.checkinEnabled) return;

  const users = await User.find({
    'notificationPreferences.enabled': true,
    // checkinEnabled ausente (usuarios viejos) cuenta como activo (default true).
    'notificationPreferences.checkinEnabled': { $ne: false },
    'dogs.0': { $exists: true },
  });

  for (const user of users) {
    const prefs = user.notificationPreferences || {};
    const tz = prefs.timezone || 'America/Argentina/Buenos_Aires';
    const checkinHour = prefs.checkinHour != null ? prefs.checkinHour : 19;

    const localDate = localDateString(tz, now);
    if (localHour(tz, now) !== checkinHour) continue;
    // Idempotencia: ya despachado hoy.
    if (prefs.checkinLastSentOn === localDate) continue;

    // Check-ins recientes de todos los perros del usuario (para rotación + dedup).
    const dogIds = user.dogs.map((d) => d._id);
    const sinceDate = addDaysToLocalDate(localDate, -7);
    const recent = await DailyCheckin.find({
      dogId: { $in: dogIds },
      localDate: { $gte: sinceDate },
    }).lean();

    const recentByDog = new Map();
    for (const c of recent) {
      const k = String(c.dogId);
      if (!recentByDog.has(k)) recentByDog.set(k, []);
      recentByDog.get(k).push(c);
    }

    const sections = [];
    for (const dog of user.dogs) {
      const section = buildDogSection(user, dog, localDate, recentByDog);
      if (section) sections.push(section);
    }

    if (sections.length === 0) {
      // Nada que preguntar (todos respondieron): marcamos el día para no reintentar.
      user.notificationPreferences.checkinLastSentOn = localDate;
      await user.save();
      continue;
    }

    // Alertas locales estacionales: se fusionan en este envío (1/día).
    const localAlerts = getActiveLocalAlerts(user, user.dogs, now);

    // Canal elegido por el usuario (respeta 1 notificación/día por canal).
    const channel = prefs.channel || 'email';
    const wantsEmail = channel === 'email' || channel === 'both';
    const wantsPush = channel === 'push' || channel === 'both';

    if (wantsEmail) {
      try {
        await EmailService.sendDailyCheckin({
          to: user.email,
          userName: user.name,
          dogs: sections.map(({ dogName, question, focus, urls }) => ({ dogName, question, focus, urls })),
          localAlerts,
        });
        for (const s of sections) {
          analytics.track('checkin_sent', { userId: user._id, dogId: s.dogId, channel: 'email', meta: { question: s.question, focus: s.focus } });
        }
      } catch (err) {
        console.error(`[CheckinJob] email failed: user=${user._id} ${err.message}`);
      }
    }

    if (wantsPush) {
      try {
        const first = sections[0];
        const ans = EmailService._checkinCopy.answers;
        const delivered = await pushService.sendToUser(user._id, {
          type: 'checkin',
          title: `🐾 ${EmailService.checkinQuestionText({ dogName: first.dogName, question: first.question, focus: first.focus })}`,
          body: sections.length > 1 ? 'Tocá para responder el check-in de tus perros' : 'Tocá una respuesta para registrar el check-in de hoy',
          actions: [
            { action: 'bien', title: ans.bien.label },
            { action: 'regular', title: ans.regular.label },
            { action: 'mal', title: ans.mal.label },
          ],
          data: {
            urls: first.urls,
            url: `${process.env.APP_URL || 'http://localhost:5173'}/dashboard`,
          },
        });
        if (delivered > 0) {
          analytics.track('checkin_sent', { userId: user._id, dogId: first.dogId, channel: 'app', meta: { question: first.question, focus: first.focus } });
        }
      } catch (err) {
        console.error(`[CheckinJob] push failed: user=${user._id} ${err.message}`);
      }
    }

    console.log(`[CheckinJob] Check-in sent: user=${user._id} dogs=${sections.length} channel=${channel}`);

    user.notificationPreferences.checkinLastSentOn = localDate;
    await user.save();
  }
}

/**
 * Inicia el scheduler del check-in diario (cada 15 minutos).
 * Cada usuario recibe a lo sumo 1 email/día gracias a checkinLastSentOn.
 */
function startCheckinJob() {
  if (!featureFlags.checkinEnabled) {
    console.log('[CheckinJob] Disabled (set CHECKIN_ENABLED=true to enable).');
    return;
  }
  cron.schedule('*/15 * * * *', () => runCheckins(new Date()));
  console.log('[CheckinJob] Scheduler started — running every 15 minutes.');
}

module.exports = { startCheckinJob, runCheckins };
