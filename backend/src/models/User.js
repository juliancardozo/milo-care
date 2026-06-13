'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const vaccinationSchema = new Schema(
  {
    vaccineName: { type: String, required: true, trim: true },
    catalogId: { type: String, trim: true, default: null },
    isCalendarRequired: { type: Boolean, default: false },
    antigenGroup: { type: String, trim: true, default: '' },
    administrationRoute: { type: String, trim: true, default: '' },
    dateAdministered: { type: Date, required: true },
    nextDueDate: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null, index: true },
    veterinarian: { type: String, trim: true },
    notes: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    documentUrl: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled', 'vencido', 'pending_vet_validation'],
      default: 'suggested',
    },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
    vetValidatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const dewormingSchema = new Schema(
  {
    productName: { type: String, required: true, trim: true },
    parasiteType: {
      type: String,
      enum: ['internal', 'external', 'both'],
      default: 'internal',
    },
    dateAdministered: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null, index: true },
    veterinarian: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled', 'vencido', 'pending_vet_validation'],
      default: 'suggested',
    },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
    vetValidatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const medicationSchema = new Schema(
  {
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    // Dosis única (ej. antiparasitario puntual): sin frecuencia ni fecha de fin.
    oneTime: { type: Boolean, default: false },
    frequencyHours: {
      type: Number,
      default: null,
      min: 1,
      max: 168,
      // Solo validamos como entero cuando hay frecuencia (las dosis únicas no la llevan).
      validate: { validator: (v) => v == null || Number.isInteger(v), message: 'frequencyHours must be an integer' },
    },
    nextReminderAt: { type: Date, default: null, index: true },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const appointmentSchema = new Schema(
  {
    title: { type: String, trim: true, default: '' },
    catalogId: { type: String, trim: true, default: null },
    isWsavaRecommended: { type: Boolean, default: false },
    appointmentType: { type: String, trim: true, default: '' },
    checklist: [{ type: String, trim: true }],
    clinicName: { type: String, trim: true, default: '' },
    vetName: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    appointmentDate: { type: Date, required: true },
    isCancelled: { type: Boolean, default: false },
    reminderAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    notes: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
  },
  { timestamps: true }
);

const symptomSchema = new Schema(
  {
    symptomType: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' },
    dateObserved: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    resolved: { type: Boolean, default: false },
    // Registro rápido (Fase 2): tipo acotado para captura en ≤2 taps. Los campos
    // detallados se completan después editando el síntoma (isQuickLog → false).
    quickType: {
      type: String,
      enum: ['vomito', 'diarrea', 'tos', 'cojera', 'decaimiento', 'inapetencia', 'otro', null],
      default: null,
    },
    photoUrl: { type: String, trim: true, default: null },
    isQuickLog: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const consultationSchema = new Schema(
  {
    vetName: { type: String, trim: true, default: '' },
    clinicName: { type: String, trim: true, default: '' },
    reason: { type: String, required: true, trim: true },
    dateOfConsult: { type: Date, required: true },
    findings: { type: String, trim: true, default: '' },
    recommendations: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const dogSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    breed: { type: String, required: true, trim: true, maxlength: 100 },
    dateOfBirth: { type: Date, required: true },
    photoUrl: { type: String, trim: true, default: null },
    countryProfile: { type: String, enum: ['AR', 'UY'], default: 'AR' },
    city: { type: String, trim: true, default: '' },
    timezone: { type: String, trim: true, default: '' },
    sex: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    neutered: { type: Boolean, default: false },
    weightKg: { type: Number, default: null },
    microchipId: { type: String, trim: true, default: null },
    birthDateConfidence: {
      type: String,
      enum: ['exact', 'estimated', 'unknown'],
      default: 'exact',
    },
    estimatedAgeMonths: { type: Number, default: null },
    lifeStage: { type: String, default: 'unknown' },
    riskProfile: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
    allergies: [{ type: String, trim: true }],
    conditions: [{ type: String, trim: true }],
    lifestyle: { type: Schema.Types.Mixed, default: {} },
    ownerPhone: { type: String, trim: true, default: '' },
    hasVeterinarian: { type: Boolean, default: false },
    veterinarianName: { type: String, trim: true, default: '' },
    veterinarianPhone: { type: String, trim: true, default: '' },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingCompletedAt: { type: Date, default: null },
    // Compartir expediente con el veterinario: link tokenizado de solo lectura.
    vetShareToken: { type: String, default: null, index: true },
    vetShareCreatedAt: { type: Date, default: null },
    vaccinations: [vaccinationSchema],
    dewormingHistory: [dewormingSchema],
    medications: [medicationSchema],
    appointments: [appointmentSchema],
    consultations: [consultationSchema],
    symptoms: [symptomSchema],
  },
  { timestamps: true }
);

// Zona del tutor (Fase 5 — opt-in). Granularidad país/región/ciudad: JAMÁS se
// persisten coordenadas (lat/lng). El schema directamente no las contempla.
const locationSchema = new Schema(
  {
    country: { type: String, enum: ['AR', 'UY'], required: true },
    region: { type: String, trim: true, default: '', maxlength: 100 },
    city: { type: String, trim: true, default: '', maxlength: 100 },
  },
  { _id: false }
);

const notificationPreferencesSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    vaccinationWindowDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
      validate: { validator: Number.isInteger, message: 'Must be an integer' },
    },
    appointmentWindowHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
      validate: { validator: Number.isInteger, message: 'Must be an integer' },
    },
    // Toggle por usuario del check-in diario. Independiente del flag de despliegue
    // featureFlags.checkinEnabled (que habilita la feature a nivel servidor): este
    // permite que el usuario active/desactive el check-in desde su perfil.
    checkinEnabled: { type: Boolean, default: true },
    // Canal de notificación del check-in diario (respeta 1/día por canal elegido).
    channel: { type: String, enum: ['email', 'push', 'both'], default: 'email' },
    // Hora local (0–23) en la que el usuario quiere recibir el check-in diario.
    checkinHour: {
      type: Number,
      default: 19,
      min: 0,
      max: 23,
      validate: { validator: Number.isInteger, message: 'checkinHour must be an integer 0–23' },
    },
    // Zona horaria IANA usada para calcular la hora local del check-in y la fecha
    // diaria. Default rioplatense.
    timezone: { type: String, trim: true, default: 'America/Argentina/Buenos_Aires' },
    // Fecha local (YYYY-MM-DD) del último check-in despachado por email. Sirve de
    // idempotencia para no enviar más de un check-in por día (principio: 1 email/día).
    checkinLastSentOn: { type: String, default: null },
  },
  { _id: false }
);

// ── User schema ───────────────────────────────────────────────────────────────

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tier: { type: String, enum: ['free', 'premium'], default: 'free' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Último pedido de interés en Premium (se notifica al admin por email).
    // Agnóstico al proveedor de pago: usado para deduplicar pedidos dentro de 24h.
    premiumInterestAt: { type: Date, default: null },
    // Premium con vencimiento (Fase 4 — recompensa de referidos). Premium efectivo =
    // tier === 'premium' (manual/permanente) O premiumUntil en el futuro.
    premiumUntil: { type: Date, default: null },
    // Código de referido permanente y único del usuario (ej. MILO-AB12).
    referralCode: { type: String, default: null, unique: true, sparse: true, uppercase: true, trim: true },
    // Fecha local (YYYY-MM-DD) de la última sorpresa mostrada (≤1/día).
    lastSurpriseOn: { type: String, default: null },
    // Ventana de "código de referido potenciado" (sorpresa): mientras esté vigente,
    // las activaciones de referidos otorgan 45 días en vez de 30.
    referralBoostUntil: { type: Date, default: null },
    reminderWindowPreference: {
      type: Number,
      default: null,
      min: 1,
      max: 60,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: 'reminderWindowPreference must be an integer between 1 and 60',
      },
    },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
    // Zona opt-in del tutor (sin coordenadas) + momento del consentimiento.
    location: { type: locationSchema, default: null },
    locationConsentAt: { type: Date, default: null },
    dogs: [dogSchema],
  },
  { timestamps: true }
);

// Never return passwordHash in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

// Premium efectivo: tier permanente o ventana premiumUntil vigente.
userSchema.methods.isPremiumActive = function (now = new Date()) {
  if (this.tier === 'premium') return true;
  return Boolean(this.premiumUntil && this.premiumUntil > now);
};

// Tier "efectivo" para UI/respuestas (no cambia el tier base 'free').
userSchema.methods.effectiveTier = function (now = new Date()) {
  return this.isPremiumActive(now) ? 'premium' : 'free';
};

// Extiende premiumUntil en `days` días desde el máximo entre ahora y el vencimiento
// actual (no se pierde tiempo ya acumulado). Usuarios premium permanentes no cambian.
userSchema.methods.grantPremiumDays = function (days, now = new Date()) {
  if (this.tier === 'premium') return;
  const base = this.premiumUntil && this.premiumUntil > now ? this.premiumUntil : now;
  this.premiumUntil = new Date(base.getTime() + days * 86400000);
};

// Migrate legacy appointments that have clinicName but no title (created before
// the title field was added). Runs on every save so no one-off migration script
// is needed.
userSchema.pre('validate', function () {
  for (const dog of this.dogs || []) {
    for (const appt of dog.appointments || []) {
      if (!appt.title) {
        appt.title = appt.clinicName || 'Consulta';
      }
    }
  }
});

module.exports = mongoose.model('User', userSchema);
