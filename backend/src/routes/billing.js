'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BillingService = require('../services/BillingService');
const MercadoPagoService = require('../services/MercadoPagoService');
const PaddleService = require('../services/PaddleService');
const SlackService = require('../services/SlackService');

const router = express.Router();

// Días de premium otorgados por un pago aprobado (ventana tipo suscripción mensual).
const PREMIUM_DAYS_PER_PAYMENT = 31;

// Proveedor de cobro B2C activo. 'paddle' = Merchant of Record (recomendado AR/UY día-0:
// es el único MoR que admite sellers de Argentina/Uruguay — LS/Polar liquidan vía Stripe
// Connect, que no opera en AR). 'mercadopago' = rail local (Plan B). Default MP por
// retrocompatibilidad.
function billingProvider() {
  return (process.env.BILLING_PROVIDER || 'mercadopago').toLowerCase();
}

// Versión del texto de consentimiento del cobro recurrente que aceptó el usuario en el
// checkout. Se versiona para trazabilidad (Ley 25.326 AR / 18.331 UY).
const RECURRING_CONSENT_VERSION = process.env.BILLING_CONSENT_VERSION || '2026-06-recurring-v1';

// POST /api/billing/interest
// Registra el interés del usuario en Premium: avisa al admin por email y le confirma
// al usuario. Flujo agnóstico al proveedor de pago (alta manual por ahora).
router.post('/interest', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    if (user.isPremiumActive()) {
      return res.status(409).json({ code: 'ALREADY_PREMIUM', message: 'User already has Premium.' });
    }

    const result = await BillingService.requestUpgrade(user, { dogsCount: user.dogs?.length || 0 });
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/subscription
// Estado del plan del usuario autenticado.
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('tier premiumInterestAt premiumUntil subscriptionProvider subscriptionStatus cancelRequestedAt');
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    return res.json({
      tier: user.tier,
      effectiveTier: user.effectiveTier(),
      premiumUntil: user.premiumUntil,
      premiumInterestAt: user.premiumInterestAt,
      subscriptionProvider: user.subscriptionProvider,
      subscriptionStatus: user.subscriptionStatus,
      cancelRequestedAt: user.cancelRequestedAt,
      // El front muestra "Cancelar" solo si hay una suscripción recurrente gobernada por el MoR.
      canCancel: Boolean(user.subscriptionProvider === 'paddle' && user.subscriptionId && !user.cancelRequestedAt),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/checkout
// Inicia el checkout de Premium con el proveedor activo (BILLING_PROVIDER). Si el
// proveedor no está configurado responde 503 y el frontend cae al flujo de interés
// manual (/interest). Devuelve `checkoutUrl` (el front redirige).
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const provider = billingProvider();

    if (provider === 'paddle') {
      if (!PaddleService.isConfigured()) {
        return res.status(503).json({ code: 'PADDLE_NOT_CONFIGURED', message: 'Paddle is not configured.' });
      }
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
      if (user.isPremiumActive()) {
        return res.status(409).json({ code: 'ALREADY_PREMIUM', message: 'User already has Premium.' });
      }
      const { checkoutUrl } = await PaddleService.createCheckout({ user });
      return res.json({ checkoutUrl, provider: 'paddle' });
    }

    // Plan B: rail local Mercado Pago (pago único que otorga una ventana de Premium).
    if (!MercadoPagoService.isConfigured()) {
      return res.status(503).json({ code: 'MP_NOT_CONFIGURED', message: 'Mercado Pago is not configured.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    if (user.isPremiumActive()) {
      return res.status(409).json({ code: 'ALREADY_PREMIUM', message: 'User already has Premium.' });
    }

    const amount = Number(process.env.PREMIUM_PRICE || 0);
    const currency = process.env.PREMIUM_CURRENCY || 'UYU';
    const { checkoutUrl, preferenceId } = await MercadoPagoService.createCheckout({ user, amount, currency });
    return res.json({ checkoutUrl, preferenceId, provider: 'mercadopago' });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook
// Notificación de Mercado Pago. Si el pago está aprobado, otorga Premium al usuario
// (resuelto por external_reference = userId). Idempotente por payment id.
router.post('/webhook', async (req, res, next) => {
  try {
    // MP manda el id del pago por body ({type,data:{id}}) o por query (?topic&id).
    const type = req.body?.type || req.query.topic || req.query.type;
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;

    // Respondemos 200 siempre que podamos procesar (MP reintenta ante no-2xx).
    if (type && type !== 'payment') return res.sendStatus(200);
    if (!paymentId) return res.sendStatus(200);

    const payment = await MercadoPagoService.getPayment(paymentId);
    if (!payment || payment.status !== 'approved') return res.sendStatus(200);

    const userId = payment.external_reference || payment.metadata?.userId;
    if (!userId) return res.sendStatus(200);

    const user = await User.findById(userId);
    if (!user) return res.sendStatus(200);

    // Idempotencia: no volver a otorgar por el mismo pago.
    if (user.premiumPaymentRef === String(paymentId)) return res.sendStatus(200);

    const wasPremium = typeof user.isPremiumActive === 'function' ? user.isPremiumActive() : false;
    user.grantPremiumDays(PREMIUM_DAYS_PER_PAYMENT);
    user.premiumPaymentRef = String(paymentId);
    await user.save();

    // Solo avisamos en la transición real free→premium (no en renovaciones).
    if (!wasPremium) {
      SlackService.notifyPlanUpgrade({ userName: user.name, userEmail: user.email });
    }

    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/paddle/webhook
// Notificación del Merchant of Record (Paddle). Firma verificada sobre el body crudo
// (header `Paddle-Signature`). El MoR gobierna el cobro recurrente; acá solo espejamos el
// estado y extendemos Premium en cada pago aprobado. Resolvemos al usuario por
// custom_data.user_id o por subscriptionId.
router.post('/paddle/webhook', async (req, res, next) => {
  try {
    const signature = req.get('Paddle-Signature');
    if (!PaddleService.verifyWebhook(req.rawBody, signature)) {
      return res.status(401).json({ code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature.' });
    }

    const event = req.body?.event_type;
    const entity = req.body?.data || {};
    const customUserId = entity.custom_data?.user_id;
    // En eventos de suscripción el id es el de la suscripción; en eventos de transacción
    // el id es el de la transacción y la suscripción va en `subscription_id`.
    const isSubEvent = String(event || '').startsWith('subscription.');
    const subscriptionId = String(entity.subscription_id || (isSubEvent ? entity.id : '') || '');

    // Resolver al usuario: primero por el custom_data del checkout, si no por subscriptionId.
    let user = null;
    if (customUserId) user = await User.findById(customUserId);
    if (!user && subscriptionId) user = await User.findOne({ subscriptionId });
    if (!user) return res.sendStatus(200); // 200 para no provocar reintentos infinitos.

    switch (event) {
      case 'subscription.created':
      case 'subscription.activated':
        user.subscriptionProvider = 'paddle';
        user.subscriptionId = subscriptionId;
        user.subscriptionStatus = entity.status || 'active';
        // El alta vía checkout del MoR implica el consentimiento del cobro recurrente.
        if (!user.consentAt) {
          user.consentAt = new Date();
          user.consentVersion = RECURRING_CONSENT_VERSION;
        }
        await user.save();
        break;

      case 'transaction.completed': {
        // Pago aprobado (primer cobro o renovación). Idempotente por id de transacción
        // para no duplicar la concesión si el MoR reintenta la notificación.
        const txRef = `pd_${entity.id}`;
        if (user.premiumPaymentRef === txRef) break;
        const wasPremium = typeof user.isPremiumActive === 'function' ? user.isPremiumActive() : false;
        user.grantPremiumDays(PREMIUM_DAYS_PER_PAYMENT);
        user.premiumPaymentRef = txRef;
        user.subscriptionStatus = 'active';
        if (subscriptionId) user.subscriptionId = subscriptionId;
        await user.save();
        // Solo la transición real free→premium (el primer cobro, no las renovaciones).
        if (!wasPremium) {
          SlackService.notifyPlanUpgrade({ userName: user.name, userEmail: user.email });
        }
        break;
      }

      case 'subscription.past_due':
        // Dunning lo corre el MoR; acá marcamos el estado para el banner in-app.
        user.subscriptionStatus = 'past_due';
        await user.save();
        break;

      case 'subscription.canceled':
        user.subscriptionStatus = 'cancelled';
        if (!user.cancelRequestedAt) user.cancelRequestedAt = new Date();
        await user.save();
        break;

      default:
        // Otros eventos (subscription.updated, etc.): sincronizar estado si vino.
        if (entity.status) {
          user.subscriptionStatus = entity.status;
          await user.save();
        }
    }

    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/cancel
// Cancela la suscripción recurrente en el MoR. El usuario conserva Premium hasta
// `premiumUntil` (no se corta el acceso al instante: evita bronca y contracargos).
router.post('/cancel', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    if (user.subscriptionProvider !== 'paddle' || !user.subscriptionId) {
      return res.status(409).json({ code: 'NO_SUBSCRIPTION', message: 'No recurring subscription to cancel.' });
    }

    await PaddleService.cancelSubscription(user.subscriptionId);
    user.subscriptionStatus = 'cancelled';
    user.cancelRequestedAt = new Date();
    await user.save();

    return res.json({ status: 'cancelled', premiumUntil: user.premiumUntil });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
