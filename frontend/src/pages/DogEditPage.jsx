import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getDog, updateDog } from '../services/api';

function useSection(initial) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function field(key) {
    return (e) => {
      const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [key]: val }));
      setSuccess(false);
    };
  }

  return { form, setForm, saving, setSaving, success, setSuccess, error, setError, field };
}

export default function DogEditPage() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const dog = useSection({});
  const owner = useSection({});
  const vet = useSection({});

  useEffect(() => {
    getDog(dogId)
      .then(({ data }) => {
        dog.setForm({
          name: data.name || '',
          breed: data.breed || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
          sex: data.sex || 'unknown',
          neutered: Boolean(data.neutered),
          weightKg: data.weightKg ?? '',
          microchipId: data.microchipId || '',
          birthDateConfidence: data.birthDateConfidence || 'exact',
        });
        owner.setForm({
          countryProfile: data.countryProfile || 'AR',
          city: data.city || '',
          timezone: data.timezone || '',
        });
        vet.setForm({
          hasVeterinarian: Boolean(data.hasVeterinarian),
          veterinarianName: data.veterinarianName || '',
          allergies: (data.allergies || []).join(', '),
          conditions: (data.conditions || []).join(', '),
        });
      })
      .catch(() => setLoadError('No se pudo cargar la ficha del perro.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogId]);

  async function save(section, payload) {
    section.setError('');
    section.setSuccess(false);
    section.setSaving(true);
    try {
      await updateDog(dogId, payload);
      section.setSuccess(true);
    } catch (err) {
      section.setError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      section.setSaving(false);
    }
  }

  function saveDog(e) {
    e.preventDefault();
    save(dog, {
      name: dog.form.name,
      breed: dog.form.breed,
      dateOfBirth: dog.form.dateOfBirth || undefined,
      sex: dog.form.sex,
      neutered: dog.form.neutered,
      weightKg: dog.form.weightKg === '' ? null : Number(dog.form.weightKg),
      microchipId: dog.form.microchipId,
      birthDateConfidence: dog.form.birthDateConfidence,
    });
  }

  function saveOwner(e) {
    e.preventDefault();
    save(owner, {
      countryProfile: owner.form.countryProfile,
      city: owner.form.city,
      timezone: owner.form.timezone,
    });
  }

  function saveVet(e) {
    e.preventDefault();
    save(vet, {
      hasVeterinarian: vet.form.hasVeterinarian,
      veterinarianName: vet.form.veterinarianName,
      allergies: vet.form.allergies
        .split(',').map((s) => s.trim()).filter(Boolean),
      conditions: vet.form.conditions
        .split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  if (loading) return <div className="page"><p>Cargando...</p></div>;
  if (loadError) return <div className="page"><p className="server-error">{loadError}</p></div>;

  return (
    <div className="page">
      <BackLink to="/dogs" label="Mis perros" />
      <header className="page-header">
        <h1>Editar ficha</h1>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Volver
        </button>
      </header>

      {/* ── Datos del perro ───────────────────────────────── */}
      <form onSubmit={saveDog} className="card" style={{ marginBottom: '12px' }}>
        <h2>Datos del perro</h2>

        <div className="field">
          <label htmlFor="dog-name">Nombre</label>
          <input id="dog-name" value={dog.form.name} onChange={dog.field('name')} required />
        </div>
        <div className="field">
          <label htmlFor="dog-breed">Raza</label>
          <input id="dog-breed" value={dog.form.breed} onChange={dog.field('breed')} required />
        </div>
        <div className="field">
          <label htmlFor="dog-dob">Fecha de nacimiento</label>
          <input id="dog-dob" type="date" value={dog.form.dateOfBirth} onChange={dog.field('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="field">
          <label htmlFor="dog-confidence">Certeza de fecha</label>
          <select id="dog-confidence" value={dog.form.birthDateConfidence} onChange={dog.field('birthDateConfidence')}>
            <option value="exact">Exacta</option>
            <option value="estimated">Estimada</option>
            <option value="unknown">Desconocida</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dog-sex">Sexo</label>
          <select id="dog-sex" value={dog.form.sex} onChange={dog.field('sex')}>
            <option value="unknown">No especificado</option>
            <option value="male">Macho</option>
            <option value="female">Hembra</option>
          </select>
        </div>
        <div className="field">
          <label className="inline-checkbox" htmlFor="dog-neutered">
            <input id="dog-neutered" type="checkbox" checked={dog.form.neutered} onChange={dog.field('neutered')} />
            <span>Castrado/a</span>
          </label>
        </div>
        <div className="field">
          <label htmlFor="dog-weight">Peso (kg)</label>
          <input id="dog-weight" type="number" min="0.1" max="200" step="0.1" value={dog.form.weightKg} onChange={dog.field('weightKg')} placeholder="Ej: 12.5" />
        </div>
        <div className="field">
          <label htmlFor="dog-chip">Microchip</label>
          <input id="dog-chip" value={dog.form.microchipId} onChange={dog.field('microchipId')} placeholder="Número de microchip (opcional)" />
        </div>

        {dog.error && <p className="field-error">{dog.error}</p>}
        {dog.success && <p className="success-message">Guardado correctamente.</p>}
        <div className="form-actions">
          <button type="submit" disabled={dog.saving}>{dog.saving ? 'Guardando…' : 'Guardar perro'}</button>
        </div>
      </form>

      {/* ── Datos del tutor ───────────────────────────────── */}
      <form onSubmit={saveOwner} className="card" style={{ marginBottom: '12px' }}>
        <h2>Datos del tutor</h2>

        <div className="field">
          <label htmlFor="owner-country">País</label>
          <select id="owner-country" value={owner.form.countryProfile} onChange={owner.field('countryProfile')}>
            <option value="AR">Argentina</option>
            <option value="UY">Uruguay</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="owner-city">Ciudad</label>
          <input id="owner-city" value={owner.form.city} onChange={owner.field('city')} placeholder="Ej: Buenos Aires" />
        </div>
        <div className="field">
          <label htmlFor="owner-tz">Zona horaria</label>
          <input id="owner-tz" value={owner.form.timezone} onChange={owner.field('timezone')} placeholder="Ej: America/Argentina/Buenos_Aires" />
        </div>

        {owner.error && <p className="field-error">{owner.error}</p>}
        {owner.success && <p className="success-message">Guardado correctamente.</p>}
        <div className="form-actions">
          <button type="submit" disabled={owner.saving}>{owner.saving ? 'Guardando…' : 'Guardar tutor'}</button>
        </div>
      </form>

      {/* ── Veterinario y salud ───────────────────────────── */}
      <form onSubmit={saveVet} className="card">
        <h2>Veterinario y salud</h2>

        <div className="field">
          <label className="inline-checkbox" htmlFor="vet-has">
            <input id="vet-has" type="checkbox" checked={vet.form.hasVeterinarian} onChange={vet.field('hasVeterinarian')} />
            <span>Tiene veterinario de cabecera</span>
          </label>
        </div>
        {vet.form.hasVeterinarian && (
          <div className="field">
            <label htmlFor="vet-name">Nombre del veterinario</label>
            <input id="vet-name" value={vet.form.veterinarianName} onChange={vet.field('veterinarianName')} placeholder="Nombre o clínica" />
          </div>
        )}
        <div className="field">
          <label htmlFor="vet-allergies">Alergias conocidas</label>
          <input id="vet-allergies" value={vet.form.allergies} onChange={vet.field('allergies')} placeholder="Separadas por coma: pollo, maíz" />
        </div>
        <div className="field">
          <label htmlFor="vet-conditions">Condiciones crónicas</label>
          <input id="vet-conditions" value={vet.form.conditions} onChange={vet.field('conditions')} placeholder="Separadas por coma: hipotiroidismo, displasia" />
        </div>

        {vet.error && <p className="field-error">{vet.error}</p>}
        {vet.success && <p className="success-message">Guardado correctamente.</p>}
        <div className="form-actions">
          <button type="submit" disabled={vet.saving}>{vet.saving ? 'Guardando…' : 'Guardar veterinario'}</button>
        </div>
      </form>

    </div>
  );
}
