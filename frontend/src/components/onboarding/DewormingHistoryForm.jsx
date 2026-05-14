import { useState } from 'react';

const EMPTY = {
  productName: '',
  parasiteType: 'internal',
  dateAdministered: '',
  nextDueDate: '',
  notes: '',
};

export default function DewormingHistoryForm({ value, onChange }) {
  const [form, setForm] = useState(EMPTY);

  function addRecord(event) {
    event.preventDefault();
    if (!form.productName || !form.dateAdministered) return;

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
    <section className="card" aria-label="Historial de desparasitación">
      <h2>Historial de desparasitación</h2>
      <p>Incluye antiparasitarios anteriores para mejorar los recordatorios. <strong>Este paso es opcional</strong> — si no tenés registros, podés continuar sin agregar nada.</p>

      {(value || []).length === 0 ? <p>Sin registros de desparasitación.</p> : null}
      <ul className="record-list">
        {(value || []).map((item, index) => (
          <li key={`${item.productName}-${item.dateAdministered}-${index}`} className="record-item">
            <strong>{item.productName}</strong>
            <span>{item.parasiteType === 'internal' ? 'Interno' : item.parasiteType === 'external' ? 'Externo' : 'Ambos'}</span>
            <span>{item.dateAdministered}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={addRecord} className="inline-form">
        <div className="field">
          <label htmlFor="dew-product">Producto antiparasitario</label>
          <input id="dew-product" placeholder="Ej: Bravecto, Simparica" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="dew-type">Tipo de parásito</label>
          <select id="dew-type" value={form.parasiteType} onChange={(e) => setForm({ ...form, parasiteType: e.target.value })}>
            <option value="internal">Interno</option>
            <option value="external">Externo</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dew-date">Fecha de aplicación</label>
          <input id="dew-date" type="date" value={form.dateAdministered} onChange={(e) => setForm({ ...form, dateAdministered: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="dew-next">Próxima aplicación (opcional)</label>
          <input id="dew-next" type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} />
        </div>
        <button type="submit" disabled={!form.productName || !form.dateAdministered}>Agregar registro</button>
      </form>
    </section>
  );
}
