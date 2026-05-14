import { useState } from 'react';

const EMPTY = {
  vaccineName: '',
  dateAdministered: '',
  nextDueDate: '',
  notes: '',
  lotNumber: '',
};

export default function VaccinationRecordForm({ value, onChange }) {
  const [form, setForm] = useState(EMPTY);

  function addRecord(event) {
    event.preventDefault();
    if (!form.vaccineName || !form.dateAdministered) return;

    onChange([
      ...(value || []),
      {
        ...form,
        status: 'completed',
        source: 'imported',
      },
    ]);

    setForm(EMPTY);
  }

  return (
    <section className="card" aria-label="Registros de vacunas">
      <h2>Registros de vacunas existentes</h2>
      <p>Carga vacunas previas para evitar recordatorios incorrectos. <strong>Este paso es opcional</strong> — si no tenés registros, podés continuar sin agregar nada.</p>

      {(value || []).length === 0 ? <p>Sin registros de vacunas.</p> : null}
      <ul className="record-list">
        {(value || []).map((item, index) => (
          <li key={`${item.vaccineName}-${item.dateAdministered}-${index}`} className="record-item">
            <strong>{item.vaccineName}</strong>
            <span>{item.dateAdministered}</span>
            {item.nextDueDate ? <span>Próxima dosis: {item.nextDueDate}</span> : null}
          </li>
        ))}
      </ul>

      <form onSubmit={addRecord} className="inline-form">
        <div className="field">
          <label htmlFor="vax-name">Vacuna</label>
          <input id="vax-name" placeholder="Ej: Triple, Rabia, Quádruple" value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="vax-date">Fecha de aplicación</label>
          <input id="vax-date" type="date" value={form.dateAdministered} onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="vax-next">Próxima dosis (opcional)</label>
          <input id="vax-next" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="vax-lot">Número de lote (opcional)</label>
          <input id="vax-lot" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} />
        </div>
        <button type="submit" disabled={!form.vaccineName || !form.dateAdministered}>Agregar registro</button>
      </form>
    </section>
  );
}
