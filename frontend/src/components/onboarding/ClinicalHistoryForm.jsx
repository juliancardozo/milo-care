function toggleSymptom(values, key, checked) {
  return {
    ...values,
    recentSymptoms: {
      ...(values.recentSymptoms || {}),
      [key]: checked,
    },
  };
}

export default function ClinicalHistoryForm({ value, onChange, errors = {} }) {
  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  const symptoms = value.recentSymptoms || {};

  return (
    <section className="card" aria-label="Historial clínico">
      <h2>Historial clínico</h2>

      <div className="field inline-checkbox">
        <input
          id="has-vet"
          type="checkbox"
          checked={Boolean(value.hasVeterinarian)}
          onChange={(e) => update('hasVeterinarian', e.target.checked)}
        />
        <label htmlFor="has-vet">Ya tengo un veterinario de confianza</label>
      </div>

      <div className="field">
        <label htmlFor="vet-name">Nombre del veterinario</label>
        <input
          id="vet-name"
          type="text"
          value={value.veterinarianName || ''}
          onChange={(e) => update('veterinarianName', e.target.value)}
          placeholder="Ej: Dr. García"
        />
      </div>

      <div className="field">
        <label htmlFor="allergies">Alergias (separadas por comas)</label>
        <input
          id="allergies"
          type="text"
          value={(value.allergies || []).join(', ')}
          onChange={(e) => update('allergies', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
          placeholder="Ej: Pollo, Trigo"
        />
      </div>

      <div className="field">
        <label htmlFor="conditions">Condiciones médicas (separadas por comas)</label>
        <input
          id="conditions"
          type="text"
          value={(value.conditions || []).join(', ')}
          onChange={(e) => update('conditions', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))}
          placeholder="Ej: Displasia de cadera, Epilepsia"
        />
      </div>

      <fieldset className="field">
        <legend>Síntomas recientes</legend>
        <label><input type="checkbox" checked={Boolean(symptoms.hasVomiting)} onChange={(e) => onChange(toggleSymptom(value, 'hasVomiting', e.target.checked))} /> Vómitos</label>
        <label><input type="checkbox" checked={Boolean(symptoms.hasDiarrhea)} onChange={(e) => onChange(toggleSymptom(value, 'hasDiarrhea', e.target.checked))} /> Diarrea</label>
        <label><input type="checkbox" checked={Boolean(symptoms.hasCough)} onChange={(e) => onChange(toggleSymptom(value, 'hasCough', e.target.checked))} /> Tos</label>
        <label><input type="checkbox" checked={Boolean(symptoms.hasSeizures)} onChange={(e) => onChange(toggleSymptom(value, 'hasSeizures', e.target.checked))} /> Convulsiones</label>
        <label><input type="checkbox" checked={Boolean(symptoms.hasBreathingDifficulty)} onChange={(e) => onChange(toggleSymptom(value, 'hasBreathingDifficulty', e.target.checked))} /> Dificultad para respirar</label>
      </fieldset>

      <div className="field">
        <label htmlFor="vax-reactions">Reacciones previas a vacunas</label>
        <textarea
          id="vax-reactions"
          rows="3"
          value={value.previousVaccineReactions || ''}
          onChange={(e) => update('previousVaccineReactions', e.target.value)}
          placeholder="Describe cualquier reacción adversa previa a vacunas"
        />
      </div>

      {errors.recentSymptoms && <p className="field-error">{errors.recentSymptoms}</p>}
    </section>
  );
}
