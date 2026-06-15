'use strict';

/**
 * Seed script: loads Milo's full clinical history into the admin user's account.
 * Source: Historia Clínica SIVET 917G, emitida 27/04/2026.
 *
 * Usage:
 *   cd backend && node scripts/seed-milo.js
 *   SEED_USER_EMAIL=owner@test.com node scripts/seed-milo.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const DEFAULT_TARGET_EMAIL = 'julian.cardozo.viggiano@gmail.com';
const CLINIC_UY = 'Clínica Veterinaria (Montevideo)';

// ── helpers ──────────────────────────────────────────────────────────────────

function d(dateStr) {
  return new Date(dateStr + 'T12:00:00.000Z');
}

// ── data ─────────────────────────────────────────────────────────────────────

const MILO = {
  name: 'Milo',
  breed: 'Border Collie',
  dateOfBirth: d('2023-10-17'),
  sex: 'male',
  countryProfile: 'UY',
  city: 'Montevideo',
  weightKg: 22.8,
  onboardingCompleted: true,
  onboardingCompletedAt: d('2024-01-22'),
  hasVeterinarian: true,
  veterinarianName: CLINIC_UY,
  lifeStage: 'adult',
  riskProfile: 'medium',

  vaccinations: [
    {
      vaccineName: 'Polivalente (Adeno, Parvo, Carre, HIC) — 1ra dosis',
      dateAdministered: d('2024-01-29'),
      nextDueDate: d('2024-02-28'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Primera dosis del ciclo de cachorro.',
    },
    {
      vaccineName: 'Polivalente (Adeno, Parvo, Carre, HIC) — 2da dosis',
      dateAdministered: d('2024-02-19'),
      nextDueDate: d('2024-03-20'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Segunda dosis del ciclo de cachorro.',
    },
    {
      vaccineName: 'Polivalente completa con Leptospira',
      dateAdministered: d('2024-03-11'),
      nextDueDate: d('2024-04-10'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Tercera dosis, se incorpora Leptospira.',
    },
    {
      vaccineName: 'Polivalente completa con Rabia',
      dateAdministered: d('2024-04-13'),
      nextDueDate: d('2025-04-13'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Refuerzo anual. Incorpora Rabia.',
    },
    {
      vaccineName: 'Novivac KC (Tos de las perreras / Bordetella)',
      dateAdministered: d('2025-04-07'),
      nextDueDate: d('2026-04-07'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Vacuna anual. Va a la guardería una vez por semana.',
    },
    {
      vaccineName: 'Polivalente completa con Rabia — refuerzo anual',
      dateAdministered: d('2025-04-30'),
      nextDueDate: d('2026-04-30'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Refuerzo anual junto con desparasitación.',
    },
    {
      vaccineName: 'Polivalente completa con Rabia (Virbac)',
      dateAdministered: d('2026-03-14'),
      nextDueDate: d('2027-03-14'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Marca Virbac. Próxima: 14/03/2027.',
    },
  ],

  dewormingHistory: [
    {
      productName: 'Power (5–10 kg) + Equilibrio RM cachorro',
      parasiteType: 'internal',
      dateAdministered: d('2024-01-22'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Primera desparasitación de cachorro. Peso: 5,9 kg.',
    },
    {
      productName: 'Pipeta Power 10 a 20 kg',
      parasiteType: 'external',
      dateAdministered: d('2024-06-10'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Pipeta antiparasitaria externa.',
    },
    {
      productName: 'Bravecto + Antiparasitario interno',
      parasiteType: 'both',
      dateAdministered: d('2024-12-05'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Bravecto externo + antiparasitario interno. Peso: 21,4 kg.',
    },
    {
      productName: 'Antiparasitario (previo a vacuna anual)',
      parasiteType: 'internal',
      dateAdministered: d('2025-04-07'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Desparasitación previa a la vacuna anual.',
    },
    {
      productName: 'Bravecto',
      parasiteType: 'external',
      dateAdministered: d('2025-11-06'),
      status: 'completed',
      source: 'manual',
      veterinarian: CLINIC_UY,
      notes: 'Control de pulgas/garrapatas. Peso: 22,8 kg.',
    },
  ],

  medications: [
    {
      medicationName: 'Clorhexidina + Crema 6a (herida abdominal)',
      dosage: 'Aplicación tópica',
      startDate: d('2024-05-20'),
      endDate: d('2024-05-23'),
      frequencyHours: 24,
      nextReminderAt: d('2024-05-23'),
      status: 'completed',
      notes: 'Herida superficial en abdomen. Control en 3 días si no mejora.',
    },
    {
      medicationName: 'Cefalexina 500 mg',
      dosage: '1 comprimido cada 12 horas',
      startDate: d('2024-09-21'),
      endDate: d('2024-09-30'),
      frequencyHours: 12,
      nextReminderAt: d('2024-09-30'),
      status: 'completed',
      notes: 'Herida lumbar por mordida, persistía húmeda por lamido. Junto con Dexa.',
    },
    {
      medicationName: 'Meloxivet (tos)',
      dosage: '1/2 comprimido por día',
      startDate: d('2024-10-03'),
      endDate: d('2024-10-10'),
      frequencyHours: 24,
      nextReminderAt: d('2024-10-10'),
      status: 'completed',
      notes: 'Tos de las perreras. Temperatura 38,9 °C. También: miel con propóleo 2 veces/día.',
    },
    {
      medicationName: 'Cerenia (antiemétic)',
      dosage: '300 (dosis indicada por vet)',
      startDate: d('2025-01-04'),
      endDate: d('2025-01-06'),
      frequencyHours: 24,
      nextReminderAt: d('2025-01-06'),
      status: 'completed',
      notes: 'Vómitos (3 episodios). Sin dolor abdominal. Dieta casera.',
    },
    {
      medicationName: 'Repen + Meloxicam 250 (post-cirugía)',
      dosage: 'Dosis veterinaria (250)',
      startDate: d('2025-01-08'),
      endDate: d('2025-01-16'),
      frequencyHours: 24,
      nextReminderAt: d('2025-01-16'),
      status: 'completed',
      notes: 'Post-operatorio extracción cuerpo extraño (pelota). Buena evolución.',
    },
    {
      medicationName: 'Cortavance spray (dermatitis)',
      dosage: 'Aplicación tópica 1 vez/día',
      startDate: d('2025-11-06'),
      endDate: d('2025-11-20'),
      frequencyHours: 24,
      nextReminderAt: d('2025-11-20'),
      status: 'completed',
      notes: 'Dermatitis leve cara interna M.Ant.Der. y leve dermatitis interdigital.',
    },
    {
      medicationName: 'Atriben (ansiedad)',
      dosage: 'Dosis veterinaria',
      startDate: d('2026-04-02'),
      endDate: d('2026-04-20'),
      frequencyHours: 24,
      nextReminderAt: d('2026-04-20'),
      status: 'completed',
      notes: 'Presuntivo: ansiedad. Viaje a Argentina. Control en una semana.',
    },
    {
      medicationName: 'Neo Entero Fosfalum (diarrea)',
      dosage: '3 veces por día por 3 días',
      startDate: d('2026-04-20'),
      endDate: d('2026-04-23'),
      frequencyHours: 8,
      nextReminderAt: d('2026-04-23'),
      status: 'completed',
      notes: 'Diarrea líquida post-viaje. Estrés previo al viaje. Dieta: arroz, pollo, queso + proplan remojado.',
    },
  ],

  symptoms: [
    {
      symptomType: 'Herida cutánea',
      description: 'Herida piel superficial en abdomen.',
      severity: 'mild',
      dateObserved: d('2024-05-20'),
      resolved: true,
      notes: 'Tto: clorhexidina + crema 6a.',
    },
    {
      symptomType: 'Herida cutánea',
      description: 'Herida piel zona lumbar con características de mordida.',
      severity: 'moderate',
      dateObserved: d('2024-09-16'),
      resolved: true,
      notes: 'Persistió húmeda por lamido. Indicado collar isabelino si persiste.',
    },
    {
      symptomType: 'Tos',
      description: 'Tos recurrente. Va a la guardería una vez por semana. Temperatura 38,9 °C. Reflejo tusígeno negativo.',
      severity: 'mild',
      dateObserved: d('2024-10-03'),
      resolved: true,
      notes: 'Mejoró con tratamiento. En visita del 8/10 aún tosía en consultorio.',
    },
    {
      symptomType: 'Vómitos',
      description: 'Vómito x3, sin apetito. Temperatura 38,3 °C. Sin dolor abdominal.',
      severity: 'moderate',
      dateObserved: d('2025-01-04'),
      resolved: true,
      notes: 'Progresó a cuadro obstructivo al día siguiente.',
    },
    {
      symptomType: 'Obstrucción intestinal',
      description: 'Vómitos biliosos, anorexia, apatía. Ecografía: patrón obstructivo, masa 3×3 cm con sombra ecográfica. Posible cuerpo extraño.',
      severity: 'severe',
      dateObserved: d('2025-01-05'),
      resolved: true,
      notes: 'Cirugía de urgencia el 06/01/2025 en clínica VEA. Extrajeron 1 pelota. Buena recuperación.',
    },
    {
      symptomType: 'Dermatitis',
      description: 'Lamido cara interna M.Ant.Der. Dermatitis leve en medial de M.Ant.Der. y muy leve dermatitis interdigital.',
      severity: 'mild',
      dateObserved: d('2025-11-06'),
      resolved: true,
      notes: 'Tto: Cortavance + Dexa s/c + Bravecto.',
    },
    {
      symptomType: 'Lesión cutánea por rascado',
      description: 'Lesión eritematosa ~2 cm próxima a uña accesoria por rascado compulsivo. Persistió con lamido a pesar de vendaje.',
      severity: 'mild',
      dateObserved: d('2026-03-27'),
      resolved: true,
      notes: 'Requirió collar isabelino. Presuntivo: ansiedad.',
    },
    {
      symptomType: 'Diarrea',
      description: 'Diarrea líquida. Come proplan. Bien hidratado.',
      severity: 'mild',
      dateObserved: d('2026-04-20'),
      resolved: false,
      notes: 'Presunto estrés previo al viaje de Montevideo a Buenos Aires.',
    },
  ],

  consultations: [
    {
      clinicName: CLINIC_UY,
      reason: 'Control cachorro — primera desparasitación',
      dateOfConsult: d('2024-01-22'),
      findings: 'Peso: 5,9 kg. Buen estado general.',
      recommendations: 'Power de 5 a 10 kg. Equilibrio RM cachorro. Inicio ciclo vacunal.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Herida superficial en abdomen',
      dateOfConsult: d('2024-05-20'),
      findings: 'Herida piel superficial en abdomen.',
      recommendations: 'Clorhexidina + crema 6a. Control en 3 días si no mejora.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Herida zona lumbar — mordida',
      dateOfConsult: d('2024-09-16'),
      findings: 'Herida con características de mordida en zona lumbar.',
      recommendations: 'Meloxicam + Dexametasona + Shotapen. Recontrol.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Seguimiento herida lumbar — lamido compulsivo',
      dateOfConsult: d('2024-09-21'),
      findings: 'Herida persiste húmeda por lamido.',
      recommendations: 'Cefalexina 500 mg 1 cada 12 hs + Dexa. Collar isabelino si persiste lamido compulsivo.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Tos recurrente (guardería)',
      dateOfConsult: d('2024-10-03'),
      findings: 'Sensorio alerta. Mucosas rosadas. Temperatura 38,9 °C. Reflejo tusígeno negativo. Auscultación sin particularidades.',
      recommendations: 'Dexa 200. Meloxivet 1/2 comp/día x 1 semana. Miel con propóleo 2 veces/día. Control en 1 semana.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Tos persistente — control',
      dateOfConsult: d('2024-10-08'),
      findings: 'Persiste tos, tose en consultorio. No mejoró en más de 1 semana. Auscultación respiratoria ruda.',
      recommendations: 'Dexa + Repen $250. Novemina en la noche. Si no mejora: radiografía.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Vómitos agudos',
      dateOfConsult: d('2025-01-04'),
      findings: 'Vómito x3. Temperatura 38,3 °C. Sin apetito. Sin dolor abdominal. Mucosas sin particularidades.',
      recommendations: 'Cerenia 300. Dieta casera.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Obstrucción intestinal — cuerpo extraño',
      dateOfConsult: d('2025-01-05'),
      findings: 'Vómitos biliosos, anorexia, apatía. Estómago distendido y firme. Eco: patrón obstructivo, masa 3×3 cm con sombra ecográfica. Mucosas rosadas. TLLC 1 seg. Sin dolor abdominal.',
      recommendations: 'Gastrine + Cerenia + Dipirona 300. Cirugía coordinada para 06/01 a las 9 am.',
    },
    {
      clinicName: 'Clínica VEA (urgencias)',
      reason: 'Cirugía de urgencia — extracción cuerpo extraño',
      dateOfConsult: d('2025-01-07'),
      findings: 'Cuadro obstructivo severo. Llevado de urgencia el domingo 06/01.',
      recommendations: 'Cirugía exitosa. Extracción de 1 pelota. Seguimiento post-operatorio.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Seguimiento post-operatorio (cirugía pelota)',
      dateOfConsult: d('2025-01-16'),
      findings: 'Buena evolución. Herida en buen estado. Come y toma agua con normalidad.',
      recommendations: 'Alta. Shotapen de mantenimiento.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Dermatitis leve — lamido en pata',
      dateOfConsult: d('2025-11-06'),
      findings: 'Sensorio alerta. Apetito normal. Mucosas rosadas. Piel: dermatitis leve en medial de M.Ant.Der. y muy leve dermatitis interdigital. Resto de piel y pelo normal.',
      recommendations: 'Cortavance + Dexa s/c + Bravecto.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Lesión eritematosa por rascado compulsivo',
      dateOfConsult: d('2026-03-27'),
      findings: 'Lesión eritematosa ~2 cm próxima a uña accesoria por rascado. Lamido persistente. Requirió vendaje y collar isabelino.',
      recommendations: 'Cortavance 2–3 días. Si no mejora: Dexa. Collar isabelino. Toques con Iodofón.',
    },
    {
      clinicName: CLINIC_UY,
      reason: 'Ansiedad — viaje a Argentina',
      dateOfConsult: d('2026-04-02'),
      findings: 'Rascado y lamido compulsivo previo al viaje. Peso: 22,8 kg.',
      recommendations: 'Atriben. Control en una semana al llegar a Argentina.',
    },
    {
      clinicName: 'Consulta post-viaje (Buenos Aires)',
      reason: 'Diarrea líquida post-viaje',
      dateOfConsult: d('2026-04-20'),
      findings: 'Diarrea líquida. Come proplan. Abdomen sin particularidades. Bien hidratado.',
      recommendations: 'Neo entero fosfalum 3 veces/día x 3 días. Dieta: arroz, pollo, queso + proplan remojado.',
    },
  ],

  appointments: [
    {
      title: 'Próxima vacuna — Novivac KC',
      appointmentDate: d('2026-04-07'),
      status: 'upcoming',
      clinicName: CLINIC_UY,
      notes: 'Refuerzo anual Bordetella. Próxima según última aplicada 07/04/2025.',
    },
    {
      title: 'Próxima vacuna — Rabia (refuerzo)',
      appointmentDate: d('2026-04-30'),
      status: 'upcoming',
      clinicName: CLINIC_UY,
      notes: 'Próxima según vacuna aplicada 30/04/2025.',
    },
  ],
};

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI no está definida en .env');
  const targetEmail = process.env.SEED_USER_EMAIL || DEFAULT_TARGET_EMAIL;

  await mongoose.connect(uri);
  console.log('✓ Conectado a MongoDB');

  const user = await User.findOne({ email: targetEmail });
  if (!user) throw new Error(`Usuario no encontrado: ${targetEmail}`);
  console.log(`✓ Usuario encontrado: ${user.name} (${user.email})`);

  // Remove existing Milo to avoid duplicates on re-run
  const existingIdx = user.dogs.findIndex(
    (d) => d.name === 'Milo' && d.breed === 'Border Collie',
  );
  if (existingIdx !== -1) {
    user.dogs.splice(existingIdx, 1);
    console.log('  → Milo existente removido (se recarga limpio)');
  }

  user.dogs.push(MILO);
  await user.save();

  const milo = user.dogs.find((d) => d.name === 'Milo' && d.breed === 'Border Collie');
  console.log(`✓ Milo cargado (id: ${milo._id})`);
  console.log(`  Vacunas:       ${milo.vaccinations.length}`);
  console.log(`  Desparasit.:   ${milo.dewormingHistory.length}`);
  console.log(`  Medicamentos:  ${milo.medications.length}`);
  console.log(`  Síntomas:      ${milo.symptoms.length}`);
  console.log(`  Consultas:     ${milo.consultations.length}`);
  console.log(`  Citas próx.:   ${milo.appointments.length}`);

  await mongoose.disconnect();
  console.log('✓ Listo.');
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
