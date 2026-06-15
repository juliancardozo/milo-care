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

function tplOverdueCare({ userName, dogName, itemName, kind, dueDate }) {
  const label = kind === 'deworming' ? 'desparasitación' : 'vacuna';
  const emoji = kind === 'deworming' ? '🪱' : '💉';
  const dateStr = dueDate ? fmtDate(dueDate) : null;
  return layout({
    title: `${dogName} tiene una ${label} atrasada`,
    preheader: `La ${label} ${itemName} de ${dogName} está vencida.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">${emoji} ${dogName} tiene una ${label} atrasada</h2>
      <p>Hola ${userName},</p>
      <p>
        La ${label} <strong>${itemName}</strong> de <strong>${dogName}</strong> ya está
        <strong>vencida</strong>${dateStr ? ` (vencía el ${dateStr})` : ''}.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        ${label.charAt(0).toUpperCase() + label.slice(1)}: ${itemName}<br/>
        Estado: <strong style="color:#b91c1c;">Atrasada</strong>
      </div>
      <p>Coordiná un turno con tu veterinario para ponerla al día.</p>
      <p style="color:#6b7280;font-size:13px;">
        Esta recomendación es informativa. Siempre consultá con un veterinario licenciado.
      </p>
    `,
  });
}

function tplReengagement({ userName, dogName }) {
  return layout({
    title: `¿Cómo está ${dogName}?`,
    preheader: `Hace unos días que no sabemos de ${dogName}.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">¿Cómo está ${dogName}? 🐾</h2>
      <p>Hola ${userName},</p>
      <p>
        Hace unos días que no registrás cómo viene ${dogName}. Un check-in rápido
        ayuda a detectar a tiempo cualquier cambio en su salud.
      </p>
      <p>Tocá abajo para contarnos cómo está hoy.</p>
    `,
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    ctaLabel: `Ver a ${dogName}`,
  });
}

function tplCoTutorInvite({ inviterName, dogName, acceptUrl, isNewUser }) {
  const intro = isNewUser
    ? `<strong>${inviterName}</strong> te invitó a co-gestionar a <strong>${dogName}</strong> en Milo Care. Creá tu cuenta y ${dogName} ya va a estar compartido con vos.`
    : `<strong>${inviterName}</strong> te invitó a co-gestionar a <strong>${dogName}</strong> en Milo Care. Vas a poder ver y administrar todo su cuidado.`;
  return layout({
    title: `${inviterName} te invitó a cuidar a ${dogName} 🐾`,
    preheader: `Co-gestioná el cuidado de ${dogName} en Milo Care.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Te invitaron a co-cuidar a ${dogName} 🐾</h2>
      <p>${intro}</p>
      <p>Como co-tutor vas a poder cargar vacunas, medicamentos, citas y síntomas, igual que ${inviterName}.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">
        Si no esperabas esta invitación, podés ignorar este correo. El enlace vence en 14 días.
      </p>
    `,
    ctaUrl: acceptUrl,
    ctaLabel: isNewUser ? 'Crear cuenta y aceptar' : 'Aceptar invitación',
  });
}

function tplMagicLink({ userName, magicUrl }) {
  return layout({
    title: 'Tu link de ingreso — Milo Care',
    preheader: 'Entrá a Milo Care sin contraseña. El enlace vence en 15 minutos.',
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Ingresá a Milo Care 🐾</h2>
      <p>Hola ${userName || ''},</p>
      <p>Tocá el botón para entrar a tu cuenta sin contraseña. El enlace es válido por <strong>15 minutos</strong> y se usa una sola vez.</p>
      <p>Si no pediste este enlace, podés ignorar este correo con total seguridad.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:20px;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br/>
        <a href="${magicUrl}" style="word-break:break-all;">${magicUrl}</a>
      </p>
    `,
    ctaUrl: magicUrl,
    ctaLabel: 'Entrar a Milo Care',
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

// ── Referidos ────────────────────────────────────────────────────────────────

function tplReferralActivated({ userName, referredName, rewardDays }) {
  return layout({
    title: '¡Tu invitado se sumó a Milo Care!',
    preheader: `${referredName} y su perro ya están en Milo Care. Ganaste ${rewardDays} días premium 🎁`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">¡Gracias por invitar! 🎁</h2>
      <p>Hola ${userName},</p>
      <p>
        <strong>${referredName}</strong> y su perro se sumaron a Milo Care gracias a vos
        y ya hicieron su primer check-in.
      </p>
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🎉 Ambos ganaron ${rewardDays} días de Premium</strong><br/>
        Ya están activos en tu cuenta. ¡A disfrutar perfiles ilimitados!
      </div>
      <p>Cuantos más tutores se sumen, mejor cuidamos a los perros de tu zona. 🐾</p>
    `,
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    ctaLabel: 'Ir a Milo Care',
  });
}

// ── Alerta acumulativa de síntomas ───────────────────────────────────────────

function tplSymptomAlert({ userName, dogName, count, windowHours, isPuppy }) {
  const detail = isPuppy
    ? `Registraste un vómito en <strong>${dogName}</strong>, que todavía es cachorro.`
    : `Registraste <strong>${count} vómitos</strong> de <strong>${dogName}</strong> en menos de ${windowHours} horas.`;
  return layout({
    title: `Esto amerita una consulta — ${dogName}`,
    preheader: `Lo que registraste de ${dogName} conviene chequearlo con el veterinario.`,
    body: `
      <h2 style="margin:0 0 16px;font-size:22px;">Esto amerita una consulta 🩺</h2>
      <p>Hola ${userName},</p>
      <p>${detail}</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;padding:14px 18px;margin:20px 0;">
        <strong>🐕 ${dogName}</strong><br/>
        ${isPuppy ? 'En cachorros, un solo vómito conviene evaluarlo sin demora.' : `Vómitos en las últimas ${windowHours} h: ${count}`}
      </div>
      <p>Te sugerimos coordinar una consulta con tu veterinario para descartar cualquier cosa.</p>
      <p style="color:#6b7280;font-size:13px;">
        Esta es una señal informativa basada en lo que registraste, no un diagnóstico. Ante la duda, consultá a un veterinario.
      </p>
    `,
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    ctaLabel: 'Agendar una cita',
  });
}

// ── Check-in diario ──────────────────────────────────────────────────────────

// Copy de las preguntas del check-in (voseo, cálido). Cada slug tiene su texto
// base; `focus` lo especializa según la regla de riesgo de raza detectada.
const CHECKIN_COPY = {
  questions: {
    comida: '¿Cómo viene comiendo {dog} estos días?',
    energia: '¿Cómo está la energía de {dog} hoy?',
    agua: '¿{dog} está tomando bien agua?',
    animo: '¿Cómo anda el ánimo de {dog} hoy?',
    digestion: '¿Cómo viene la digestión de {dog} (panza, caca)?',
  },
  // Especializaciones por alertType de symptomRiskRules.
  focus: {
    respiratory: '¿Notás a {dog} agitado, con jadeo o ronquidos al moverse?',
    cardiac: '¿{dog} se cansa rápido, tose o se agita más de lo normal?',
    orthopedic: '¿{dog} se mueve con normalidad o lo notás dolorido o rengo?',
    neurological: '¿Notás a {dog} desorientado, tambaleante o raro al caminar?',
    gastrointestinal: '¿Cómo viene la panza de {dog} (vómitos, caca, apetito)?',
    parasitological: '¿Notás algo raro en la caca de {dog} o que esté bajando de peso?',
  },
  answers: {
    bien: { label: 'Bien 😊', color: '#22c55e' },
    regular: { label: 'Más o menos 😐', color: '#f59e0b' },
    mal: { label: 'No tan bien 😟', color: '#ef4444' },
  },
};

function checkinQuestionText({ dogName, question, focus = null }) {
  const tpl = (focus && CHECKIN_COPY.focus[focus]) || CHECKIN_COPY.questions[question] || '¿Cómo está {dog} hoy?';
  return tpl.replace('{dog}', dogName);
}

function checkinButtons(urls) {
  return ['bien', 'regular', 'mal'].map((answer) => {
    const meta = CHECKIN_COPY.answers[answer];
    return `<a href="${urls[answer]}"
      style="display:inline-block;margin:4px 6px;padding:12px 22px;border-radius:9px;
             background:${meta.color};color:#fff;text-decoration:none;font-weight:600;font-size:15px;">
      ${meta.label}</a>`;
  }).join('');
}

function checkinLocalAlerts(localAlerts = []) {
  if (!localAlerts.length) return '';
  const items = localAlerts.map((a) => `
      <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:6px;padding:14px 16px;margin:10px 0;">
        <strong>${a.emoji || '📍'} ${a.title}</strong><br/>
        <span style="color:#4b5563;font-size:14px;">${a.message}</span>
      </div>`).join('');
  return `
      <div style="margin:22px 0 4px;">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Alerta de tu zona</p>
        ${items}
      </div>`;
}

function tplDailyCheckin({ userName, dogs, localAlerts = [] }) {
  const sections = dogs.map(({ dogName, question, focus, urls }) => `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:16px 0;text-align:center;">
        <p style="margin:0 0 14px;font-size:17px;color:#1a1a2e;font-weight:600;">
          ${checkinQuestionText({ dogName, question, focus })}
        </p>
        <div>${checkinButtons(urls)}</div>
      </div>`).join('');

  const single = dogs.length === 1;
  return layout({
    title: single ? `¿Cómo está ${dogs[0].dogName} hoy?` : 'Tu check-in diario en Milo Care',
    preheader: single
      ? `Contanos cómo está ${dogs[0].dogName} con un toque.`
      : 'Contanos cómo están tus perros con un toque.',
    body: `
      <h2 style="margin:0 0 12px;font-size:22px;">¡Hola ${userName}! 🐾</h2>
      <p>Tu check-in diario de 10 segundos. Respondé directo desde acá:</p>
      ${sections}
      ${checkinLocalAlerts(localAlerts)}
      <p style="color:#6b7280;font-size:13px;margin-top:18px;">
        Cada respuesta queda registrada en el seguimiento de tu perro y le puede
        servir a tu veterinario. Si preferís, también podés responder desde la app.
      </p>
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

  /** Magic link de ingreso sin contraseña (vence en 15 min) */
  async sendMagicLink({ to, userName, magicUrl }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: 'Tu link de ingreso a Milo Care 🐾',
      html: tplMagicLink({ userName, magicUrl }),
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

  /** Aviso al referente: su invitado se activó y ambos ganaron premium */
  async sendReferralActivated({ to, userName, referredName, rewardDays }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `¡${referredName} se sumó gracias a vos! 🎁`,
      html: tplReferralActivated({ userName, referredName, rewardDays }),
    });
  },

  /** Alerta acumulativa de síntomas (ej. ≥2 vómitos/24h) con CTA a agendar cita */
  async sendSymptomAlert({ to, userName, dogName, count, windowHours, isPuppy }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `${dogName}: esto amerita una consulta 🩺`,
      html: tplSymptomAlert({ userName, dogName, count, windowHours, isPuppy }),
    });
  },

  /** Check-in diario "¿Cómo está [perro] hoy?" — uno por usuario por día.
   *  Las alertas locales (Fase 5) se fusionan acá para respetar 1 email/día. */
  async sendDailyCheckin({ to, userName, dogs, localAlerts = [] }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: dogs.length === 1 ? `¿Cómo está ${dogs[0].dogName} hoy? 🐾` : 'Tu check-in diario de Milo Care 🐾',
      html: tplDailyCheckin({ userName, dogs, localAlerts }),
    });
  },

  /** Campaña de vencidos (Fase 3): vacuna/desparasitación atrasada. */
  async sendOverdueCare({ to, userName, dogName, itemName, kind, dueDate }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `${dogName} tiene una ${kind === 'deworming' ? 'desparasitación' : 'vacuna'} atrasada`,
      html: tplOverdueCare({ userName, dogName, itemName, kind, dueDate }),
    });
  },

  /** Re-engagement (Fase 3): hace días sin check-in. */
  async sendReengagement({ to, userName, dogName }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `¿Cómo está ${dogName}? 🐾`,
      html: tplReengagement({ userName, dogName }),
    });
  },

  /** Invitación a co-tutor (Premium). Dos variantes: cuenta nueva vs. existente. */
  async sendCoTutorInvite({ to, inviterName, dogName, acceptUrl, isNewUser }) {
    await sendWithRetry({
      from: FROM,
      to,
      subject: `${inviterName} te invitó a cuidar a ${dogName} en Milo Care 🐾`,
      html: tplCoTutorInvite({ inviterName, dogName, acceptUrl, isNewUser }),
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
    magicLink: tplMagicLink,
    premiumInterest: tplPremiumInterest,
    premiumInterestConfirmation: tplPremiumInterestConfirmation,
    coTutorInvite: tplCoTutorInvite,
    overdueCare: tplOverdueCare,
    reengagement: tplReengagement,
    dailyCheckin: tplDailyCheckin,
    symptomAlert: tplSymptomAlert,
    referralActivated: tplReferralActivated,
  },

  // Expose check-in copy so the question text stays consistent across email,
  // the one-click confirmation page, and tests.
  _checkinCopy: CHECKIN_COPY,
  checkinQuestionText,
};

module.exports = EmailService;
