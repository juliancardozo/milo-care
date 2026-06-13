import PhotoInput from '../PhotoInput';

export default function DogBasicInfoForm({ value, onChange, errors = {} }) {
  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <section className="card" aria-label="Información básica del perro">
      <h2>Detalles del perro</h2>

      <div className="field onb-photo-field">
        <label>Foto de tu perro</label>
        <PhotoInput value={value.photoUrl || ''} onChange={(url) => update('photoUrl', url)} />
      </div>

      <div className="field">
        <label htmlFor="dog-name">Nombre del perro</label>
        <input
          id="dog-name"
          type="text"
          value={value.name || ''}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="dog-breed">Raza</label>
        <input
          id="dog-breed"
          type="text"
          value={value.breed || ''}
          onChange={(e) => update('breed', e.target.value)}
          aria-invalid={Boolean(errors.breed)}
          placeholder="Ej: Labrador, Mestizo, etc."
        />
        {errors.breed && <span className="field-error">{errors.breed}</span>}
      </div>

      <div className="field">
        <label htmlFor="dog-birth-date">Fecha de nacimiento</label>
        <input
          id="dog-birth-date"
          type="date"
          value={value.birthDate || ''}
          onChange={(e) => update('birthDate', e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          aria-invalid={Boolean(errors.birthDate)}
        />
        {errors.birthDate && <span className="field-error">{errors.birthDate}</span>}
      </div>

      <div className="field">
        <label htmlFor="dog-estimated-age">Edad estimada en meses</label>
        <input
          id="dog-estimated-age"
          type="number"
          min="0"
          value={value.estimatedAgeMonths || ''}
          onChange={(e) => update('estimatedAgeMonths', e.target.value)}
          placeholder="Si no conoces la fecha exacta"
        />
      </div>

      <div className="field">
        <label htmlFor="dog-sex">Sexo</label>
        <select
          id="dog-sex"
          value={value.sex || 'unknown'}
          onChange={(e) => update('sex', e.target.value)}
        >
          <option value="unknown">Desconocido</option>
          <option value="male">Macho</option>
          <option value="female">Hembra</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="dog-size">Tamaño</label>
        <select
          id="dog-size"
          value={value.size || 'medium'}
          onChange={(e) => update('size', e.target.value)}
        >
          <option value="small">Pequeño</option>
          <option value="medium">Mediano</option>
          <option value="large">Grande</option>
          <option value="giant">Gigante</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="dog-weight">Peso (kg)</label>
        <input
          id="dog-weight"
          type="number"
          min="0"
          step="0.1"
          value={value.weightKg || ''}
          onChange={(e) => update('weightKg', e.target.value)}
          aria-invalid={Boolean(errors.weightKg)}
        />
        {errors.weightKg && <span className="field-error">{errors.weightKg}</span>}
      </div>

      <div className="field">
        <label htmlFor="dog-microchip">ID de Microchip</label>
        <input
          id="dog-microchip"
          type="text"
          value={value.microchipId || ''}
          onChange={(e) => update('microchipId', e.target.value)}
          placeholder="15 dígitos (opcional)"
        />
      </div>

      <div className="field inline-checkbox">
        <input
          id="dog-neutered"
          type="checkbox"
          checked={Boolean(value.neutered)}
          onChange={(e) => update('neutered', e.target.checked)}
        />
        <label htmlFor="dog-neutered">Castrado / Esterilizado</label>
      </div>
    </section>
  );
}
