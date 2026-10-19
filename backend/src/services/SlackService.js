'use strict';

/**
 * SlackService — notificaciones internas del negocio hacia Slack vía Incoming
 * Webhooks (sin bot token ni OAuth). Modelado sobre EmailService: helpers de
 * formato + funciones públicas por evento.
 *
 * Reglas de oro:
 *   - Fire-and-forget: NINGUNA función pública lanza ni bloquea el flujo del
 *     usuario. Se pueden llamar sin `await`. Ante fallo de Slack, solo se loguea.
 *   - No-op silencioso si SLACK_ENABLED !== 'true' o falta SLACK_WEBHOOK_URL.
 *   - Nunca se loguean las URLs de webhook (solo err.message, que no las expone).
 *
 * Canales:
 *   - main    → SLACK_WEBHOOK_URL              (eventos de activación/crecimiento)
 *   - billing → SLACK_WEBHOOK_URL_BILLING      (upgrades/downgrades/límite de tier)
 *   - alerts  → SLACK_WEBHOOK_URL_ALERTS       (bajas, resets, acciones admin)
 *   Si una URL opcional no está definida, cae al webhook principal.
 */

const TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (typeof t.unref === 'function') t.unref(); // no mantener vivo el event loop
  });
}

// ── Configuración (leída en cada llamada para que los tests puedan togglear env) ──

function isEnabled() {
  return process.env.SLACK_ENABLED === 'true' && Boolean(process.env.SLACK_WEBHOOK_URL);
}

function webhookFor(channel) {
  const main = process.env.SLACK_WEBHOOK_URL;
  if (channel === 'billing') return process.env.SLACK_WEBHOOK_URL_BILLING || main;
  if (channel === 'alerts') return process.env.SLACK_WEBHOOK_URL_ALERTS || main;
  return main;
}

// Warn de arranque, una sola vez (lo dispara server.js vía init()).
let _initLogged = false;
function init() {
  if (_initLogged) return;
  _initLogged = true;
  if (isEnabled()) {
    console.log('[SlackService] Slack notifications enabled.');
  } else {
    console.warn(
      '[SlackService] Slack notifications disabled — SLACK_ENABLED must be "true" and SLACK_WEBHOOK_URL set. Running as no-op.'
    );
  }
}

// ── Transporte ────────────────────────────────────────────────────────────────

/**
 * Envía un payload a un webhook con timeout de 5s y 1 reintento (backoff 2s) ante
 * error de red o 5xx. Errores 4xx (payload/webhook inválido) no se reintentan.
 * try/catch total: ante fallo definitivo solo loguea.
 */
async function send(webhookUrl, payload, attempt = 1) {
  if (!webhookUrl) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (typeof timer.unref === 'function') timer.unref(); // fire-and-forget: no bloquear el exit
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.status >= 500) {
      throw new Error(`Slack responded with status ${res.status}`);
    }
    // 2xx → ok. 4xx → no tiene sentido reintentar; se loguea y se corta.
    if (res.status >= 400) {
      console.error(`[SlackService] Slack rejected the message (status ${res.status}); not retrying.`);
    }
  } catch (err) {
    if (attempt < 2) {
      await sleep(RETRY_DELAY_MS);
      return send(webhookUrl, payload, attempt + 1);
    }
    console.error(`[SlackService] send failed after ${attempt} attempt(s): ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Punto de entrada fire-and-forget: no-op si está deshabilitado y jamás rechaza.
 * Devuelve una promesa (por si el caller quiere `.catch(() => {})`), que nunca falla.
 */
function notify(channel, payload) {
  if (!isEnabled()) return Promise.resolve();
  return send(webhookFor(channel), payload).catch((err) => {
    console.error(`[SlackService] unexpected error: ${err.message}`);
  });
}

// ── Formato (Block Kit) ───────────────────────────────────────────────────────

function fmtDateTime(date = new Date()) {
  return new Date(date).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Edad legible en español a partir de la fecha de nacimiento. */
function formatAge(dob) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 1) return 'Recién nacido';
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

function field(label, value) {
  return { type: 'mrkdwn', text: `*${label}:*\n${value == null || value === '' ? '—' : value}` };
}

/**
 * Arma un mensaje Block Kit: header + section con fields + context con timestamp,
 * entorno (NODE_ENV) y app. Slack admite máximo 10 fields por section.
 */
function message({ header, fields = [], note }) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: header, emoji: true } },
  ];
  if (fields.length) {
    blocks.push({ type: 'section', fields: fields.slice(0, 10) });
  }
  if (note) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: note } });
  }
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Milo Care · backend · ${process.env.NODE_ENV || 'development'} · ${fmtDateTime()} (ART)`,
      },
    ],
  });
  return { blocks };
}

// Etiquetas legibles por tipo de registro de salud (para los hitos de activación).
const RECORD_LABELS = {
  vaccination: 'vacuna',
  medication: 'medicamento',
  appointment: 'cita',
  symptom: 'síntoma',
};

// ── API pública (una función por evento) ──────────────────────────────────────

const SlackService = {
  init,
  isEnabled,

  /** 🎉 Registro exitoso — canal principal. */
  notifyNewUser({ name, email, tier, country } = {}) {
    const fields = [
      field('Nombre', name),
      field('Email', email),
      field('Plan', tier || 'free'),
    ];
    if (country) fields.push(field('País', country));
    fields.push(field('Fecha', `${fmtDateTime()} (ART)`));
    return notify('main', message({ header: '🎉 Nuevo usuario registrado', fields }));
  },

  /** 🐶 Alta de perro — canal principal. Marca el 1er perro como activación. */
  notifyNewDog({ userName, userEmail, dogName, breed, dob, totalDogsUser } = {}) {
    const firstDog = Number(totalDogsUser) === 1;
    const fields = [
      field('Perro', dogName),
      field('Raza', breed),
      field('Edad', formatAge(dob)),
      field('Dueño', userName),
      field('Email', userEmail),
    ];
    if (firstDog) fields.push(field('Hito', '🥇 Primer perro (activación)'));
    return notify('main', message({ header: '🐶 Nuevo perro agregado', fields }));
  },

  /** ✅ Primer registro de salud de cada tipo por perro — canal principal. */
  notifyHealthRecordMilestone({ userEmail, dogName, recordType } = {}) {
    const label = RECORD_LABELS[recordType] || recordType || 'registro';
    return notify('main', message({
      header: `✅ Primer registro de ${label}`,
      fields: [
        field('Perro', dogName),
        field('Tipo', label),
        field('Email', userEmail),
      ],
    }));
  },

  /** 💎 Upgrade a Premium — canal billing. */
  notifyPlanUpgrade({ userName, userEmail, fromTier = 'free', toTier = 'premium' } = {}) {
    return notify('billing', message({
      header: '💎 Upgrade a Premium',
      fields: [
        field('Usuario', userName),
        field('Email', userEmail),
        field('Plan', `${fromTier} → ${toTier}`),
      ],
    }));
  },

  /** 📉 Downgrade a Free — canal billing. */
  notifyPlanDowngrade({ userName, userEmail, fromTier = 'premium', toTier = 'free' } = {}) {
    return notify('billing', message({
      header: '📉 Downgrade a Free',
      fields: [
        field('Usuario', userName),
        field('Email', userEmail),
        field('Plan', `${fromTier} → ${toTier}`),
      ],
    }));
  },

  /** 🚧 Usuario free chocó el límite de 1 perro — canal billing (señal de upgrade). */
  notifyTierLimitHit({ userName, userEmail } = {}) {
    return notify('billing', message({
      header: '🚧 Usuario free chocó el límite de 1 perro',
      fields: [
        field('Usuario', userName),
        field('Email', userEmail),
      ],
      note: '_Señal de intención de upgrade — candidato directo a Premium. Hacé follow-up._',
    }));
  },

  /** ⚠️ Cuenta eliminada — canal alerts. */
  notifyAccountDeleted({ userEmail, dogsCount, accountAgeDays } = {}) {
    return notify('alerts', message({
      header: '⚠️ Cuenta eliminada',
      fields: [
        field('Email', userEmail),
        field('Perros que tenía', dogsCount != null ? String(dogsCount) : '—'),
        field('Antigüedad', accountAgeDays != null ? `${accountAgeDays} días` : '—'),
      ],
    }));
  },

  /** 🗑️ Perro eliminado — canal alerts. */
  notifyDogDeleted({ userEmail, dogName } = {}) {
    return notify('alerts', message({
      header: '🗑️ Perro eliminado',
      fields: [
        field('Email', userEmail),
        field('Perro', dogName),
      ],
    }));
  },

  /** 🔑 Solicitud de reset de contraseña — canal alerts. */
  notifyPasswordReset({ userEmail } = {}) {
    return notify('alerts', message({
      header: '🔑 Solicitud de reset de contraseña',
      fields: [field('Email', userEmail)],
    }));
  },

  /** 🛡️ Acción de admin — canal alerts. */
  notifyAdminAction({ adminEmail, action, targetEmail, details } = {}) {
    const fields = [
      field('Admin', adminEmail),
      field('Acción', action),
      field('Sobre', targetEmail),
    ];
    if (details) fields.push(field('Detalle', details));
    return notify('alerts', message({ header: '🛡️ Acción de admin', fields }));
  },

  /** 📊 Resumen diario — canal principal. Recibe un objeto de métricas ya calculadas. */
  notifyDailySummary(summary = {}) {
    const {
      newUsers24h = 0, newDogs24h = 0, upgrades24h = 0, downgrades24h = 0,
      accountsDeleted24h = null, totalUsers = 0, totalDogs = 0, pctPremium = 0,
    } = summary;
    const deletedLine = accountsDeleted24h == null
      ? 'n/d (ver #milo-alertas en tiempo real)'
      : String(accountsDeleted24h);
    return notify('main', message({
      header: '📊 Resumen diario Milo Care',
      fields: [
        field('Nuevos usuarios (24 h)', String(newUsers24h)),
        field('Nuevos perros (24 h)', String(newDogs24h)),
        field('Upgrades/renovaciones (24 h)', String(upgrades24h)),
        field('Downgrades/cancelaciones (24 h)', String(downgrades24h)),
        field('Cuentas eliminadas (24 h)', deletedLine),
        field('Total usuarios', String(totalUsers)),
        field('Total perros', String(totalDogs)),
        field('% Premium', `${pctPremium}%`),
      ],
    }));
  },

  // Exponer helpers internos para tests.
  _internal: { send, isEnabled, webhookFor, formatAge, message },
};

module.exports = SlackService;
