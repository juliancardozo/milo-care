'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Partner (Organization) — capa B2B2C "Companion".
 *
 * Una aseguradora / fintech / banco / veterinaria que entrega Milo Care
 * white-label a sus clientes. Es ADITIVO: los usuarios y perros sin `partnerId`
 * siguen funcionando exactamente como el producto B2C de hoy.
 *
 * Nota de arquitectura: la `Clinic` del Kit de Activación Veterinaria preexiste
 * y sigue funcionando igual; opcionalmente se vincula a un Partner vía
 * `Clinic.partnerId` (no se la absorbe).
 */

// Branding white-label resuelto por el frontend (CSS variables) a partir del slug.
const brandingSchema = new Schema(
  {
    logoUrl: { type: String, default: null, trim: true },
    primaryColor: { type: String, default: null, trim: true },
    secondaryColor: { type: String, default: null, trim: true },
    appName: { type: String, default: null, trim: true },
  },
  { _id: false }
);

// Contrato comercial. La facturación al partner (UsageRecord/BillingRecord) llega
// en Fase 2; acá solo se guardan los parámetros del contrato.
const contractSchema = new Schema(
  {
    setupFee: { type: Number, default: 0, min: 0 },
    pricePerActivePet: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['ARS', 'UYU', 'USD'], default: 'USD' },
    billingDay: { type: Number, default: 1, min: 1, max: 28 },
  },
  { _id: false }
);

const partnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Identificador white-label (subdominio/slug). Único, minúsculas.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    type: { type: String, enum: ['insurer', 'fintech', 'bank', 'vet'], required: true },
    branding: { type: brandingSchema, default: () => ({}) },
    contract: { type: contractSchema, default: () => ({}) },
    // Feature flags habilitadas para la cohorte de este partner (gating por partner).
    features: { type: [String], default: [] },
    // Hash de la API key del partner (la key en claro solo se muestra al crearla).
    apiKeyHash: { type: String, default: null },
    // Webhook saliente (leads de seguro, eventos). Se usa a partir de Fase 3.
    webhookUrl: { type: String, default: null, trim: true },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);
