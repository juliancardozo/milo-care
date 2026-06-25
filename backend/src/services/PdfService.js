'use strict';

const PDFDocument = require('pdfkit');

// Paleta base (Milo Care). El carnet es marca-neutral salvo el nombre de app,
// que se inyecta por white-label cuando el perro pertenece a un partner.
const INK = '#1a1a2e';
const MUTED = '#6b7280';

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ageDisplay(dog) {
  if (!dog.dateOfBirth) return 'Edad desconocida';
  const birth = new Date(dog.dateOfBirth);
  if (isNaN(birth.getTime())) return 'Edad desconocida';
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  return `${years} ${years === 1 ? 'año' : 'años'}${rem ? ` ${rem} m` : ''}`;
}

/**
 * Genera el carnet/historial de salud de un perro como PDF (Buffer).
 *
 * @param {object} dog - subdocumento del perro (POJO o Mongoose doc).
 * @param {object} [opts]
 * @param {string} [opts.appName] - nombre de app white-label (default "Milo Care").
 * @returns {Promise<Buffer>}
 */
function generateDogHealthPdf(dog, opts = {}) {
  const d = dog.toObject ? dog.toObject() : dog;
  const appName = opts.appName || 'Milo Care';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──
    doc.fillColor(INK).fontSize(20).text(`Resumen de Salud de ${d.name || 'Mascota'}`, { continued: false });
    doc.moveDown(0.2);
    doc.fillColor(MUTED).fontSize(10)
      .text('Documento informativo para llevar al veterinario · No reemplaza el diagnóstico profesional.');
    doc.fontSize(9).text(`Generado por ${appName} · ${fmtDate(new Date())}`);
    doc.moveDown(0.8);

    const section = (title) => {
      doc.moveDown(0.6);
      doc.fillColor(INK).fontSize(13).text(title);
      doc.moveTo(doc.x, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#e5e7eb').stroke();
      doc.moveDown(0.4).fontSize(10);
    };

    const line = (label, value) => {
      doc.fillColor(MUTED).text(`${label}: `, { continued: true }).fillColor(INK).text(value ?? '—');
    };

    // ── Perfil ──
    section('Perfil');
    line('Nombre', d.name);
    line('Raza', d.breed);
    line('Edad', ageDisplay(d));
    line('Sexo', d.sex === 'male' ? 'Macho' : d.sex === 'female' ? 'Hembra' : 'Desconocido');
    if (d.weightKg != null) line('Peso', `${d.weightKg} kg`);
    line('Microchip', d.microchipId || 'No registrado');
    line('País', d.countryProfile || 'AR');
    line('Alergias', d.allergies && d.allergies.length ? d.allergies.join(', ') : 'Sin registrar');
    line('Condiciones', d.conditions && d.conditions.length ? d.conditions.join(', ') : 'Sin registrar');

    // ── Vacunas ──
    const vaccinations = (d.vaccinations || []).filter((v) => v.dateAdministered);
    if (vaccinations.length) {
      section('Historial de vacunas');
      vaccinations
        .sort((a, b) => new Date(b.dateAdministered) - new Date(a.dateAdministered))
        .forEach((v) => {
          doc.fillColor(INK).text(`• ${v.vaccineName}`, { continued: true })
            .fillColor(MUTED).text(`  —  aplicada ${fmtDate(v.dateAdministered)}${v.nextDueDate ? `, próxima ${fmtDate(v.nextDueDate)}` : ''}${v.lotNumber ? `, lote ${v.lotNumber}` : ''}`);
        });
    }

    // ── Desparasitación ──
    const deworming = (d.dewormingHistory || []).filter((x) => x.dateAdministered);
    if (deworming.length) {
      section('Desparasitación');
      deworming
        .sort((a, b) => new Date(b.dateAdministered) - new Date(a.dateAdministered))
        .forEach((x) => {
          doc.fillColor(INK).text(`• ${x.productName}`, { continued: true })
            .fillColor(MUTED).text(`  —  ${fmtDate(x.dateAdministered)}${x.nextDueDate ? `, próxima ${fmtDate(x.nextDueDate)}` : ''}`);
        });
    }

    // ── Medicación activa ──
    const meds = (d.medications || []).filter((m) => m.status === 'active' || m.isActive);
    if (meds.length) {
      section('Medicación actual');
      meds.forEach((m) => {
        doc.fillColor(INK).text(`• ${m.medicationName}`, { continued: true })
          .fillColor(MUTED).text(`  —  ${m.dosage || ''}${m.frequencyHours ? `, cada ${m.frequencyHours}h` : ''}`);
      });
    }

    // ── Síntomas recientes ──
    const symptoms = (d.symptoms || []).slice().sort((a, b) => new Date(b.dateObserved) - new Date(a.dateObserved)).slice(0, 10);
    if (symptoms.length) {
      section('Síntomas registrados (últimos 10)');
      symptoms.forEach((s) => {
        doc.fillColor(INK).text(`• ${fmtDate(s.dateObserved)}`, { continued: true })
          .fillColor(MUTED).text(`  —  ${s.symptomType || s.quickType || 'síntoma'} (${s.severity || 'mild'}): ${s.description || ''}`);
      });
    }

    // ── Disclaimer ──
    doc.moveDown(1);
    doc.fillColor(MUTED).fontSize(8)
      .text('Este documento es informativo y fue generado a partir de los registros cargados por el tutor. No constituye diagnóstico ni prescripción veterinaria. Consultá siempre a tu veterinario.', { align: 'left' });

    doc.end();
  });
}

module.exports = { generateDogHealthPdf };
