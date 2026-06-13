import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import '../../styles/pdf-template.css';

// Agrupa los check-ins diarios por semana (lunes) para el resumen del PDF.
// El prompt pide resumen por semana, no día por día.
function weeklyCheckinSummary(checkins) {
  const weeks = new Map();
  for (const c of checkins || []) {
    if (!c.localDate) continue;
    const [y, m, d] = c.localDate.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    const dow = (date.getUTCDay() + 6) % 7; // 0 = lunes
    const monday = new Date(date.getTime() - dow * 86400000);
    const key = monday.toISOString().slice(0, 10);
    if (!weeks.has(key)) weeks.set(key, { weekStart: key, bien: 0, regular: 0, mal: 0, total: 0 });
    const w = weeks.get(key);
    if (w[c.answer] != null) w[c.answer] += 1;
    w.total += 1;
  }
  return [...weeks.values()].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
}

const PdfTemplate = React.forwardRef(
  ({ dog, symptoms, consultations, vaccinations, medications, appointments, checkins }, ref) => {
    const checkinWeeks = weeklyCheckinSummary(checkins);
    const calculateAge = () => {
      if (!dog?.dateOfBirth) return 'Unknown';
      const birth = new Date(dog.dateOfBirth);
      const now = new Date();
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return `${years}y ${remainingMonths}m`;
    };

    return (
      <div ref={ref} className="pdf-template">
        {/* Header */}
        <div className="pdf-header">
          <div className="header-title">
            <h1>🐾 Resumen de Salud de {dog?.name}</h1>
            <p className="subtitle">Documento para llevar al veterinario</p>
          </div>
          <div className="header-info">
            <p>Generado: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Dog Profile */}
        <section className="pdf-section">
          <h2>📋 Perfil del Perro</h2>
          <div className="profile-grid">
            <div className="profile-item">
              <strong>Nombre:</strong> {dog?.name}
            </div>
            <div className="profile-item">
              <strong>Edad:</strong> {calculateAge()}
            </div>
            <div className="profile-item">
              <strong>Raza:</strong> {dog?.breed}
            </div>
            <div className="profile-item">
              <strong>Sexo:</strong> {dog?.sex === 'male' ? 'Macho' : 'Hembra'}
            </div>
            <div className="profile-item">
              <strong>Peso:</strong> {dog?.weightKg} kg
            </div>
            <div className="profile-item">
              <strong>Microchip:</strong> {dog?.microchipId || 'No registrado'}
            </div>
            <div className="profile-item">
              <strong>Perfil de Riesgo:</strong>{' '}
              <span className={`risk-badge risk-${dog?.riskProfile}`}>
                {dog?.riskProfile?.toUpperCase()}
              </span>
            </div>
            <div className="profile-item">
              <strong>Alergias:</strong> {dog?.allergies?.length ? dog.allergies.join(', ') : 'Sin registrar'}
            </div>
            <div className="profile-item">
              <strong>Condiciones:</strong> {dog?.conditions?.length ? dog.conditions.join(', ') : 'Sin registrar'}
            </div>
          </div>
        </section>

        {/* Vaccination History */}
        {vaccinations && vaccinations.length > 0 && (
          <section className="pdf-section">
            <h2>💉 Historial de Vacunas</h2>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Vacuna</th>
                  <th>Fecha</th>
                  <th>Próxima Dosis</th>
                  <th>Lote</th>
                </tr>
              </thead>
              <tbody>
                {vaccinations.map((v, idx) => (
                  <tr key={idx}>
                    <td>{v.vaccineName}</td>
                    <td>{formatDate(v.dateAdministered)}</td>
                    <td>{v.nextDueDate ? formatDate(v.nextDueDate) : '—'}</td>
                    <td>{v.lotNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Medications */}
        {medications && medications.length > 0 && (
          <section className="pdf-section">
            <h2>💊 Medicamentos Actuales</h2>
            <div className="medications-list">
              {medications
                .filter((m) => m.status === 'active')
                .map((med, idx) => (
                  <div key={idx} className="medication-item">
                    <div className="med-name">{med.medicationName}</div>
                    <div className="med-details">
                      <span>Dosis: {med.dosage}</span>
                      <span>Frecuencia: Cada {med.frequencyHours}h</span>
                      {med.endDate && <span>Hasta: {formatDate(med.endDate)}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Recent Symptoms */}
        {symptoms && symptoms.length > 0 && (
          <section className="pdf-section">
            <h2>🏥 Síntomas Recientes</h2>
            <div className="symptoms-list">
              {symptoms.slice(0, 10).map((sym, idx) => (
                <div key={idx} className="symptom-item">
                  <div className="symptom-header">
                    <strong>{sym.symptomType}</strong>
                    <span className={`severity-badge severity-${sym.severity}`}>
                      {sym.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p>{sym.description}</p>
                  <small>{formatDate(sym.dateObserved)}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Consultations */}
        {consultations && consultations.length > 0 && (
          <section className="pdf-section">
            <h2>👨‍⚕️ Consultas Recientes</h2>
            <div className="consultations-list">
              {consultations.slice().reverse().slice(0, 5).map((cons, idx) => (
                <div key={idx} className="consultation-item">
                  <div className="cons-header">
                    <strong>{cons.reason}</strong>
                    <span>{formatDate(cons.dateOfConsult)}</span>
                  </div>
                  {cons.vetName && <p><strong>Vet:</strong> {cons.vetName}</p>}
                  {cons.findings && <p><strong>Hallazgos:</strong> {cons.findings}</p>}
                  {cons.recommendations && <p><strong>Recomendaciones:</strong> {cons.recommendations}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {appointments && appointments.length > 0 && (
          <section className="pdf-section">
            <h2>📅 Próximos Turnos y Controles</h2>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Fecha</th>
                  <th>Clínica</th>
                  <th>Veterinario</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment, idx) => (
                  <tr key={idx}>
                    <td>{appointment.title || 'Consulta'}</td>
                    <td>{formatDate(appointment.appointmentDate)}</td>
                    <td>{appointment.clinicName || '—'}</td>
                    <td>{appointment.vetName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Seguimiento diario (check-ins) — resumen por semana */}
        {checkinWeeks && checkinWeeks.length > 0 && (
          <section className="pdf-section">
            <h2>🐾 Seguimiento Diario</h2>
            <p className="checklist-intro">
              Resumen semanal de los check-ins de bienestar (😊 bien · 😐 más o menos · 😟 no tan bien):
            </p>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Semana del</th>
                  <th>😊 Bien</th>
                  <th>😐 Más o menos</th>
                  <th>😟 No tan bien</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {checkinWeeks.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{formatDate(w.weekStart)}</td>
                    <td>{w.bien}</td>
                    <td>{w.regular}</td>
                    <td>{w.mal}</td>
                    <td>{w.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Vet Checklist */}
        <section className="pdf-section vet-checklist">
          <h2>✓ Checklist para la Consulta Veterinaria</h2>
          <p className="checklist-intro">
            Observaciones que pueden ser útiles para el veterinario:
          </p>
          <div className="checklist-grid">
            <label className="checklist-item">
              <input type="checkbox" />
              Apetito normal
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Energía normal
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Peso estable
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Sin vómitos ni diarrea
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Respiración normal
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Movimiento normal
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Piel y pelaje saludables
            </label>
            <label className="checklist-item">
              <input type="checkbox" />
              Sin picazón
            </label>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="pdf-disclaimer">
          <p>
            <strong>Aclaración Importante:</strong> Este documento es educativo y no reemplaza
            la consulta con un veterinario licenciado. Las recomendaciones pueden variar según
            el país, estado de salud y criterios profesionales del veterinario.
          </p>
        </section>

        {/* Footer */}
        <div className="pdf-footer">
          <p>Milo Care — Gestión de Salud de Mascotas</p>
          <p>www.milocare.online</p>
        </div>
      </div>
    );
  }
);

PdfTemplate.displayName = 'PdfTemplate';

export default PdfTemplate;
