'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Anthropic = require('@anthropic-ai/sdk');
const Lead = require('../models/Lead');
const User = require('../models/User');
const EmailService = require('./EmailService');
const { issueMagicLinkUrl, SALT_ROUNDS } = require('./magicLinkService');
const SYSTEM_PROMPT = require('../config/miloBotPrompt');

// Modelo barato y rápido, suficiente para este flujo guiado de captación.
const MODEL = process.env.MILO_BOT_MODEL || 'claude-haiku-4-5-20251001';
// max_tokens bajo para forzar respuestas cortas (2–4 oraciones).
const MAX_TOKENS = Number(process.env.MILO_BOT_MAX_TOKENS) || 400;

// Cliente perezoso: si falta ANTHROPIC_API_KEY, el server arranca igual y el
// endpoint responde 503 (el widget queda oculto).
let _client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add it to backend/.env to enable Milo bot.');
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function isEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function enumOrUndefined(v, allowed) {
  return allowed.includes(v) ? v : undefined;
}

// ── Herramienta de captura de lead ────────────────────────────────────────────
const leadTool = {
  name: 'registrar_lead',
  description:
    'Registrá al visitante como lead cuando te dejó su nombre Y su email (ambos obligatorios). '
    + 'Completá los campos opcionales solo con datos que el visitante te dio en la conversación; '
    + 'no inventes nada. Después de llamar a esta herramienta, confirmá al visitante con calidez.',
  input_schema: {
    type: 'object',
    properties: {
      nombre: { type: 'string', description: 'Nombre del visitante.' },
      email: { type: 'string', description: 'Email del visitante.' },
      tipo_lead: { type: 'string', enum: ['tutor', 'veterinario', 'otro'] },
      nombre_perro: { type: 'string', description: 'Nombre del perro, si lo mencionó.' },
      edad_perro: { type: 'string', description: 'Edad aproximada del perro, si la mencionó.' },
      ciudad_pais: { type: 'string', description: 'Ciudad y/o país, si lo mencionó.' },
      dolor_principal: {
        type: 'string',
        enum: ['vacunas', 'medicamentos', 'citas', 'historial', 'sintomas', 'otro'],
      },
      interes: {
        type: 'string',
        enum: ['acceso_anticipado', 'premium', 'clinica_piloto', 'solo_info'],
      },
      notas: { type: 'string', description: 'Resumen de la conversación en 1 línea.' },
    },
    required: ['nombre', 'email'],
  },
};

// Persiste el lead y dispara el welcome. Devuelve el tool_result que vuelve al modelo.
async function captureLead(input = {}) {
  const email = String(input.email || '').trim().toLowerCase();
  const nombre = str(input.nombre);

  if (!isValidEmail(email)) {
    return {
      ok: false,
      message: 'El email no parece válido. No confirmes el registro: pedile el email de nuevo con amabilidad.',
    };
  }

  const doc = {
    email,
    tipo: 'bot',
    nombre,
    nombreMascota: str(input.nombre_perro),
    tipoLead: enumOrUndefined(input.tipo_lead, ['tutor', 'veterinario', 'otro']),
    edadPerro: str(input.edad_perro),
    ciudadPais: str(input.ciudad_pais),
    dolorPrincipal: enumOrUndefined(input.dolor_principal, [
      'vacunas', 'medicamentos', 'citas', 'historial', 'sintomas', 'otro',
    ]),
    interes: enumOrUndefined(input.interes, [
      'acceso_anticipado', 'premium', 'clinica_piloto', 'solo_info',
    ]),
    notas: str(input.notas),
  };

  let lead;
  try {
    lead = await Lead.create(doc);
  } catch (err) {
    console.error('[MiloBot] no se pudo guardar el lead:', err.message);
    return {
      ok: false,
      message: 'Hubo un problema técnico guardando el registro. Pedí disculpas y ofrecé hola@milocare.org.',
    };
  }

  // Crear (o recuperar) la cuenta y mandarle un magic link para que entre directo.
  // Best-effort: si algo falla, el lead ya quedó guardado igual.
  let magicSent = false;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);
      try {
        user = await User.create({ email, name: nombre || 'Tutor/a', passwordHash });
      } catch (e) {
        // Carrera: la cuenta se creó en paralelo (email único) → recuperarla.
        if (e && e.code === 11000) user = await User.findOne({ email });
        else throw e;
      }
    }
    const magicUrl = await issueMagicLinkUrl(user);
    await EmailService.sendMagicLink({ to: user.email, userName: user.name, magicUrl });
    magicSent = true;
  } catch (err) {
    console.error('[MiloBot] no se pudo crear la cuenta / enviar el magic link:', err.message);
  }

  return {
    ok: true,
    lead,
    message: magicSent
      ? 'Lead registrado y cuenta creada. Se le envió al email un link de ingreso (vence en 15 minutos). Confirmale repitiendo su email y decile que toque el botón del correo para entrar directo a Milo Care.'
      : 'El lead quedó guardado, pero el email con el link de ingreso no se pudo enviar. Confirmale que lo anotaste y ofrecé hola@milocare.org si no le llega nada.',
  };
}

/**
 * Corre un turno de conversación con Milo.
 * @param {Array<{role:'user'|'assistant', content:string}>} incomingMessages historial completo.
 * @returns {Promise<{reply:string, lead:object|null}>}
 */
async function chat(incomingMessages) {
  const client = getClient();
  const system = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
  const messages = incomingMessages.map((m) => ({ role: m.role, content: m.content }));

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    tools: [leadTool],
    messages,
  });

  let capturedLead = null;

  // El bot captura como mucho un lead por turno → un solo round-trip de herramienta.
  let guard = 0;
  while (response.stop_reason === 'tool_use' && guard < 2) {
    guard += 1;
    const toolUses = response.content.filter((b) => b.type === 'tool_use');
    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const tu of toolUses) {
      if (tu.name === 'registrar_lead') {
        const result = await captureLead(tu.input);
        if (result.ok && !capturedLead) capturedLead = result.lead;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: result.message,
          is_error: !result.ok,
        });
      } else {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: 'Herramienta desconocida.',
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
    // eslint-disable-next-line no-await-in-loop
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: [leadTool],
      messages,
    });
  }

  const reply = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
    || 'Perdón, se me cruzaron los cables 🐾 ¿Me lo repetís?';

  return {
    reply,
    lead: capturedLead
      ? { email: capturedLead.email, nombre: capturedLead.nombre }
      : null,
  };
}

module.exports = { chat, isEnabled };
