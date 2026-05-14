const OPTIONS = [
  { key: 'livesIndoors',          label: 'Vive mayormente en interior',                    neutral: true },
  { key: 'dogParkAttendance',     label: 'Asiste a parques para perros' },
  { key: 'daycare',               label: 'Asiste a guardería canina' },
  { key: 'cohabitsWithDogs',      label: 'Convive con otros perros' },
  { key: 'groomer',               label: 'Asiste regularmente a peluquería canina' },
  { key: 'ruralOrVisitsRural',    label: 'Vive o visita áreas rurales' },
  { key: 'rawDiet',               label: 'Come dieta cruda (BARF u similar)' },
  { key: 'contactWithRodents',    label: 'Tiene contacto con roedores o fauna silvestre' },
  { key: 'standsWater',           label: 'Tiene contacto frecuente con agua estancada' },
];

export default function LifestyleForm({ value = {}, onChange }) {
  function update(key, checked) {
    onChange({ ...value, [key]: checked });
  }

  return (
    <section className="card" aria-label="Estilo de vida y factores de riesgo">
      <h2>Estilo de vida y factores de riesgo</h2>
      <p>
        Seleccioná las opciones que aplican. Estas respuestas se usan para personalizar
        el calendario preventivo y calcular el perfil de riesgo.
      </p>

      <div className="checkbox-grid">
        {OPTIONS.map(({ key, label }) => (
          <label key={key} className="inline-checkbox" htmlFor={`lifestyle-${key}`}>
            <input
              id={`lifestyle-${key}`}
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={(e) => update(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
