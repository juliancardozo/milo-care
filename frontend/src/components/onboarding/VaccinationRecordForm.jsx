import { useState } from 'react';
import VaccineCatalogSelect from '../VaccineCatalogSelect';

const EMPTY_FORM = { dateAdministered: '', nextDueDate: '', lotNumber: '' };

export default function VaccinationRecordForm({ value, onChange, country = 'AR' }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [catalogMeta, setCatalogMeta] = useState(null);

  function addRecord(event) {
    event.preventDefault();
    if (!catalogMeta?.vaccineName || !form.dateAdministered) return;

    onChange([
      ...(value || []),
      {
        vaccineName: catalogMeta.vaccineName,
        catalogId: catalogMeta.catalogId || null,
        isCalendarRequired: catalogMeta.isCalendarRequired || false,
        antigenGroup: catalogMeta.antigenGroup || '',
        dateAdministered: form.dateAdministered,
        nextDueDate: form.nextDueDate || null,
        lotNumber: form.lotNumber,
        status: 'completed',
        source: 'imported',
      },
    ]);

    setForm(EMPTY_FORM);
    setCatalogMeta(null);
  }

  return (
    <section className="card" aria-label="Registros de vacunas">
      <h2>Registros de vacunas existentes</h2>
      <p>
        Cargá las vacunas que ya recibió el perro para evitar recordatorios incorrectos.{' '}
        <strong>Este paso es opcional</strong> — si no tenés registros, podés continuar sin agregar nada.
      </p>

      {(value || []).length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Sin registros de vacunas.</p>
      ) : (
        <ul className="record-list">
          {(value || []).map((item, index) => (
            <li key={`${item.vaccineName}-${item.dateAdministered}-${index}`} className="record-item">
              <div className="record-info">
                <h3>
                  {item.vaccineName}
                  {item.isCalendarRequired && (
                    <span className="badge-senasa-inline" style={{ marginLeft: '8px' }}>⚠ SENASA</span>
                  )}
                </h3>
                {item.antigenGroup && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{item.antigenGroup}</p>
                )}
                <p>{item.dateAdministered}</p>
                {item.nextDueDate && <p>Próxima: {item.nextDueDate}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addRecord} className="inline-form" style={{ marginTop: '16px' }}>
        <VaccineCatalogSelect
          country={country}
          value={catalogMeta?.vaccineName || ''}
          onChange={setCatalogMeta}
        />

        <div className="field">
          <label htmlFor="ob-vax-date">Fecha de aplicación</label>
          <input
            id="ob-vax-date"
            type="date"
            value={form.dateAdministered}
            onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="ob-vax-next">Próxima dosis (opcional)</label>
          <input
            id="ob-vax-next"
            type="date"
            value={form.nextDueDate}
            onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="ob-vax-lot">N° de lote (opcional)</label>
          <input
            id="ob-vax-lot"
            value={form.lotNumber}
            onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
            placeholder="Lote del producto"
          />
        </div>

        <button
          type="submit"
          disabled={!catalogMeta?.vaccineName || !form.dateAdministered}
        >
          Agregar registro
        </button>
      </form>
    </section>
  );
}
