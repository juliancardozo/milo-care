'use strict';

const { Resend } = require('resend');
const { layout } = require('./emailLayout');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@milocura.com';

// Lazy client — only instantiated when actually needed so missing
// RESEND_API_KEY in dev doesn't crash the server on startup.
let _resend = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set. Add it to backend/.env to send emails.');
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(payload, attempt = 1) {
  try {
    const { error } = await getResend().emails.send(payload);
    if (error) throw new Error(error.message);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
      return sendWithRetry(payload, attempt + 1);
    }
    throw err;
  }
}

function fmtDate(date) {
  return new Date(date).toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function fmtDateTime(date) {
  return new Date(date).toLocaleString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Templates ────────────────────────────────────────────────────────────────

function tplWelcome({ userName }) {
  return layout({
    title: 'Bienvenido a Milo Care',
    preheader: `¡Hola ${userName}! Tu cuenta está lista.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">¡Bienvenido a Milo Care, ${userName}! 🐾</h2>
      <p>Tu cuenta fue creada exitosamente. A partir de ahora podés:</p>
      <ul style="padding-left:20px;margin:12px 0;">
        <li>Registrar el perfil de tu perro</li>
        <li>Cargar su historial de vacunas, medicamentos y citas</li>
        <li>Recibir recordatorios automáticos por correo</li>
        <li>Consultar su historial completo de salud</li>
      </ul>
      <p>Ingresá a la app para comenzar.</p>
    `,
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    ctaLabel: 'Ir a Milo Care',
  });
}

function tplVaccinationReminder({ userName, dogName, vaccineName, nextDueDate }) {
  const dateStr = fmtDate(nextDueDate);
  return layout({
    title: `Recordatorio de vacuna — ${dogName}`,
    preheader: `La vacuna ${vaccineName} de ${dogName} vence el ${dateStr}.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Recordatorio de vacuna 💉</h2>
      <p>Hola ${userName},</p>
      <p>
        La vacuna <strong>${vaccineName}</strong> de <strong>${dogName}</strong>
        está próxima a vencer el <strong>${dateStr}</strong>.
      </p>
      <div style="background:#eff6ff;border-left:4px solid #4f8ef7;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        Vacuna: ${vaccineName}<br/>
        Fecha límite: ${dateStr}
      </div>
      <p>Contactá a tu veterinario de confianza para coordinar el turno a tiempo.</p>
      <p style="color:#6b7280;font-size:13px;">
        Esta recomendación es informativa. Siempre consultá con un veterinario licenciado.
      </p>
    `,
  });
}

function tplDewormingReminder({ userName, dogName, productName, nextDueDate }) {
  const dateStr = nextDueDate ? fmtDate(nextDueDate) : null;
  return layout({
    title: `Recordatorio de desparasitación — ${dogName}`,
    preheader: `Es momento de desparasitar a ${dogName}.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Recordatorio de desparasitación 🐛</h2>
      <p>Hola ${userName},</p>
      <p>
        Es hora de la próxima desparasitación de <strong>${dogName}</strong>
        ${productName ? `con <strong>${productName}</strong>` : ''}.
        ${dateStr ? `La fecha programada es el <strong>${dateStr}</strong>.` : ''}
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        ${productName ? `Producto: ${productName}<br/>` : ''}
        ${dateStr ? `Fecha: ${dateStr}` : 'Coordinar con veterinario'}
      </div>
      <p>Consultá con tu veterinario si tenés dudas sobre el producto o la dosis.</p>
      <p style="color:#6b7280;font-size:13px;">
        Esta recomendación es informativa. Seguí siempre la indicación de tu veterinario.
      </p>
    `,
  });
}

function tplMedicationReminder({ userName, dogName, medicationName, dosage }) {
  return layout({
    title: `Recordatorio de medicación — ${dogName}`,
    preheader: `Hora de la dosis de ${medicationName} para ${dogName}.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Hora de la medicación 💊</h2>
      <p>Hola ${userName},</p>
      <p>
        Es momento de darle a <strong>${dogName}</strong> su dosis de
        <strong>${medicationName}</strong>${dosage ? ` (${dosage})` : ''}.
      </p>
      <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        Medicamento: ${medicationName}<br/>
        ${dosage ? `Dosis: ${dosage}` : ''}
      </div>
      <p>Si tenés alguna duda sobre la medicación, contactá a tu veterinario.</p>
    `,
  });
}

function tplAppointmentReminder({ userName, dogName, appointmentTitle, clinicName, appointmentDate }) {
  const dateStr = fmtDateTime(appointmentDate);
  const clinic = clinicName || 'tu veterinario';
  return layout({
    title: `Recordatorio de cita — ${dogName}`,
    preheader: `${dogName} tiene una cita mañana: ${appointmentTitle || 'consulta veterinaria'}.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Recordatorio de cita veterinaria 🏥</h2>
      <p>Hola ${userName},</p>
      <p>
        <strong>${dogName}</strong> tiene una cita programada para mañana.
      </p>
      <div style="background:#f0f6ff;border-left:4px solid #4f8ef7;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        ${appointmentTitle ? `Tipo: ${appointmentTitle}<br/>` : ''}
        Lugar: ${clinic}<br/>
        Fecha y hora: ${dateStr}
      </div>
      <p>Recordá llevar la cartilla de vacunas y cualquier estudio previo que tengas.</p>
    `,
  });
}

function tplPasswordReset({ resetUrl }) {
  return layout({
    title: 'Restablecer contraseña — Milo Care',
    preheader: 'Solicitaste restablecer tu contraseña. El enlace vence en 1 hora.',
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Restablecer contraseña 🔐</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p>Hacé clic en el botón de abajo para crear una nueva contraseña. El enlace es válido por <strong>1 hora</strong>.</p>
      <p>Si no solicitaste esto, podés ignorar este correo con total seguridad.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
        <a href="${resetUrl}" style="word-break:break-all;">${resetUrl}</a>
      </p>
    `,
    ctaUrl: resetUrl,
    ctaLabel: 'Restablecer contraseña',
  });
}

function tplPremiumInterest({ userName, userEmail, userId, dogsCount, requestedAt }) {
  const dateStr = fmtDateTime(requestedAt || new Date());
  return layout({
    title: 'Nuevo interés en Premium',
    preheader: `${userName} está interesado en Milo Care Premium.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Nuevo interés en Premium ⭐</h2>
      <p>Un usuario expresó interés en pasarse a <strong>Milo Care Premium</strong>:</p>
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>Nombre:</strong> ${userName || '(sin nombre)'}<br/>
        <strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a><br/>
        <strong>Perros registrados:</strong> ${dogsCount != null ? dogsCount : '—'}<br/>
        <strong>Fecha:</strong> ${dateStr}<br/>
        <strong>User ID:</strong> ${userId}
      </div>
      <p>Contactá al usuario para coordinar el alta de Premium.</p>
    `,
  });
}

function tplPremiumInterestConfirmation({ userName }) {
  return layout({
    title: 'Recibimos tu interés en Premium',
    preheader: 'Gracias por tu interés en Milo Care Premium. Te vamos a contactar.',
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">¡Gracias por tu interés! ⭐</h2>
      <p>Hola ${userName},</p>
      <p>
        Recibimos tu interés en <strong>Milo Care Premium</strong>. Nuestro equipo se va a
        poner en contacto con vos a la brevedad para ayudarte con el alta.
      </p>
      <div style="background:#eff6ff;border-left:4px solid #4f8ef7;border-radius:4px;padding:14px 18px;margin:20px 0;">
        Mientras tanto, podés seguir usando tu cuenta con normalidad. 🐾
      </div>
      <p>¡Gracias por confiar en Milo Care!</p>
    `,
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    ctaLabel: 'Ir a Milo Care',
  });
}

// ── EmailService ─────────────────────────────────────────────────────────────

const EmailService = {

  /** Bienvenida post-registro */
  async sendWelcome({ to, userName }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `¡Bienvenido a Milo Care, ${userName}!`,
      html: tplWelcome({ userName }),
    });
  },

  /** Recordatorio de vacuna próxima a vencer */
  async sendVaccinationReminder({ to, userName, dogName, vaccineName, nextDueDate }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Recordatorio: vacuna ${vaccineName} de ${dogName}`,
      html: tplVaccinationReminder({ userName, dogName, vaccineName, nextDueDate }),
    });
  },

  /** Recordatorio de desparasitación */
  async sendDewormingReminder({ to, userName, dogName, productName, nextDueDate }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Recordatorio: desparasitación de ${dogName}`,
      html: tplDewormingReminder({ userName, dogName, productName, nextDueDate }),
    });
  },

  /** Recordatorio de dosis de medicamento */
  async sendMedicationReminder({ to, userName, dogName, medicationName, dosage }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Recordatorio: medicación de ${dogName}`,
      html: tplMedicationReminder({ userName, dogName, medicationName, dosage }),
    });
  },

  /** Recordatorio de cita veterinaria */
  async sendAppointmentReminder({ to, userName, dogName, appointmentTitle, clinicName, appointmentDate }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Recordatorio: cita de ${dogName} mañana`,
      html: tplAppointmentReminder({ userName, dogName, appointmentTitle, clinicName, appointmentDate }),
    });
  },

  /** Restablecimiento de contraseña */
  async sendPasswordReset({ to, resetUrl }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: 'Restablecer tu contraseña de Milo Care',
      html: tplPasswordReset({ resetUrl }),
    });
  },

  /** Aviso interno al admin: un usuario quiere Premium */
  async sendPremiumInterestNotification({ to, userName, userEmail, userId, dogsCount, requestedAt }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `Nuevo interés en Premium: ${userName || userEmail}`,
      html: tplPremiumInterest({ userName, userEmail, userId, dogsCount, requestedAt }),
    });
  },

  /** Confirmación al usuario de que recibimos su interés en Premium */
  async sendPremiumInterestConfirmation({ to, userName }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: 'Recibimos tu interés en Milo Care Premium',
      html: tplPremiumInterestConfirmation({ userName }),
    });
  },

  // Expose templates for admin preview
  _templates: {
    welcome: tplWelcome,
    vaccination: tplVaccinationReminder,
    deworming: tplDewormingReminder,
    medication: tplMedicationReminder,
    appointment: tplAppointmentReminder,
    passwordReset: tplPasswordReset,
    premiumInterest: tplPremiumInterest,
    premiumInterestConfirmation: tplPremiumInterestConfirmation,
  },
};

module.exports = EmailService;
