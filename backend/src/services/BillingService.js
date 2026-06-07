'use strict';

const User = require('../models/User');
const EmailService = require('./EmailService');

// Email interno que recibe los avisos de interés en Premium.
const ADMIN_EMAIL = process.env.BILLING_NOTIFY_EMAIL || 'julian.cardozo.viggiano@gmail.com';

// Ventana de deduplicación: no reenviar el aviso si el usuario ya pidió en las últimas 24h.
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

// Registra el interés de un usuario en el plan Premium.
//
// Billing agnóstico: hoy el "proveedor" activo es email-interés (alta manual). En el futuro,
// un proveedor de pago real implementaría esta misma operación devolviendo, por ejemplo,
// { checkoutUrl } para redirigir al checkout. El resto de la app no debería cambiar.
async function requestUpgrade(user, { dogsCount } = {}) {
  const now = new Date();
  const deduped =
    !!user.premiumInterestAt && (now - user.premiumInterestAt) < DEDUPE_WINDOW_MS;

  if (!deduped) {
    // 1) Notificar al admin (bloqueante: si falla, el caller responde el error).
    await EmailService.sendPremiumInterestNotification({
      to: ADMIN_EMAIL,
      userName: user.name,
      userEmail: user.email,
      userId: String(user._id),
      dogsCount,
      requestedAt: now,
    });

    // 2) Confirmar al usuario (fire-and-forget: no bloquear el flujo si falla).
    EmailService.sendPremiumInterestConfirmation({ to: user.email, userName: user.name })
      .catch((err) => console.error('[Billing] Confirmation email failed:', err.message));

    // 3) Registrar el pedido para deduplicar futuros clics.
    await User.findByIdAndUpdate(user._id, { premiumInterestAt: now });
  }

  return { status: 'interest_registered', deduped };
}

module.exports = { requestUpgrade };
