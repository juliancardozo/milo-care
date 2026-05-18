export default function OwnerProfileForm({ value, onChange, errors = {} }) {
  function update(field, nextValue) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <section className="card" aria-label="Perfil del tutor">
      <h2>Perfil del tutor</h2>

      <div className="field">
        <label htmlFor="owner-name">Nombre</label>
        <input
          id="owner-name"
          type="text"
          value={value.name || ''}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="owner-email">Email</label>
        <input
          id="owner-email"
          type="email"
          value={value.email || ''}
          onChange={(e) => update('email', e.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>

      <div className="field">
        <label htmlFor="owner-phone">Teléfono</label>
        <input
          id="owner-phone"
          type="text"
          value={value.phone || ''}
          onChange={(e) => update('phone', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="owner-country">País</label>
        <select
          id="owner-country"
          value={value.country || 'AR'}
          onChange={(e) => update('country', e.target.value)}
          aria-invalid={Boolean(errors.country)}
        >
          <option value="AR">Argentina</option>
          <option value="UY">Uruguay</option>
        </select>
        {errors.country && <span className="field-error">{errors.country}</span>}
      </div>

      <div className="field">
        <label htmlFor="owner-city">Ciudad</label>
        <input
          id="owner-city"
          type="text"
          value={value.city || ''}
          onChange={(e) => update('city', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="owner-timezone">Zona horaria</label>
        <input
          id="owner-timezone"
          type="text"
          placeholder="America/Argentina/Buenos_Aires"
          value={value.timezone || ''}
          onChange={(e) => update('timezone', e.target.value)}
        />
      </div>

      <div className="field inline-checkbox">
        <input
          id="owner-disclaimer"
          type="checkbox"
          checked={Boolean(value.disclaimerAccepted)}
          onChange={(e) => update('disclaimerAccepted', e.target.checked)}
        />
        <label htmlFor="owner-disclaimer">I understand Milo Care is advisory and not a clinical diagnosis.</label>
      </div>
      {errors.disclaimerAccepted && <span className="field-error">{errors.disclaimerAccepted}</span>}
    </section>
  );
}
