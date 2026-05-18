const STATUS_LABELS = {
  suggested: 'Sugerida',
  upcoming: 'Próxima',
  pending_vet_validation: 'Pendiente de validación veterinaria',
  completed: 'Aplicada',
};

function isAppliedVaccine(v) {
  return v.status === 'completed' || v.source === 'manual' || v.administeredAt;
}

function VaccinePreviewList({ title, events }) {
  if (events.length === 0) return null;
  return (
    <>
      <h3 style={{ marginTop: '12px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      <ul className="record-list">
        {events.map((v, i) => (
          <li key={v.id || i} className="record-item">
            <strong>{v.vaccineType}</strong>
            <span>{STATUS_LABELS[v.status] || v.status}</span>
            <span>{v.nextDueAt ? new Date(v.nextDueAt).toLocaleDateString('es-AR') : 'A confirmar'}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function CalendarPreview({ calendar }) {
  if (!calendar) return null;

  const vaccines = calendar.vaccines || [];
  const deworming = calendar.deworming || [];
  if (vaccines.length === 0 && deworming.length === 0) return null;

  const appliedVax = vaccines.filter(isAppliedVaccine);
  const suggestedVax = vaccines.filter((v) => !isAppliedVaccine(v));

  return (
    <section className="card">
      <h2>Vista previa del calendario generado</h2>

      {vaccines.length > 0 && (
        <>
          <VaccinePreviewList title="Aplicadas" events={appliedVax} />
          <VaccinePreviewList title="Sugeridas / próximas" events={suggestedVax} />
        </>
      )}

      {deworming.length > 0 && (
        <>
          <h3 style={{ marginTop: '16px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Desparasitación
          </h3>
          <ul className="record-list">
            {deworming.map((d, i) => (
              <li key={d.id || i} className="record-item">
                <strong>{d.productName}</strong>
                <span>{STATUS_LABELS[d.status] || d.status}</span>
                <span>{d.nextDueAt ? new Date(d.nextDueAt).toLocaleDateString('es-AR') : 'A confirmar'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function SummaryStep({ values, summary }) {
  return (
    <>
      <section className="card">
        <h2>Revisión del resumen</h2>
        <p>Revisá tus respuestas y verificá la información clave antes de confirmar.</p>
        <ul>
          <li>Tutor: {values.owner.name || 'Falta'}</li>
          <li>Email: {values.owner.email || 'Falta'}</li>
          <li>Perro: {values.dog.name || 'Falta'}</li>
          <li>Raza: {values.dog.breed || 'Falta'}</li>
          <li>País: {values.owner.country || 'Falta'}</li>
          <li>Vacunas cargadas: {(values.vaccines || []).length}</li>
          <li>Desparasitaciones cargadas: {(values.deworming || []).length}</li>
        </ul>
        {summary?.calendar?.missingData?.length ? (
          <p className="field-error">Datos faltantes: {summary.calendar.missingData.join(', ')}</p>
        ) : null}
      </section>

      <CalendarPreview calendar={summary?.calendar} />
    </>
  );
}
