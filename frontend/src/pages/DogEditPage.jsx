import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getDog, updateDog } from '../services/api';
import '../styles/dog-edit.css';

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

function Switch({ checked, onChange }) {
  return (
    <label className="dogedit-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="dogedit-sl" />
    </label>
  );
}

function meterMessage(pct, name) {
  if (pct >= 100) return `¡Conocés a ${name} de pies a cola! 🏆`;
  if (pct >= 70) return '¡Casi! Falta poquito para la ficha completa 🐾';
  if (pct >= 40) return `Vas conociendo a ${name} cada vez mejor`;
  return `Contanos más de ${name} para cuidarlo mejor 💛`;
}

export default function DogEditPage() {
  const { dogId } = useParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showPhoto, setShowPhoto] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevPct = useRef(0);

  const dog = useSection({});
  const owner = useSection({});
  const vet = useSection({});

  useEffect(() => {
    getDog(dogId)
      .then(({ data }) => {
        dog.setForm({
          name: data.name || '', breed: data.breed || '',
          photoUrl: data.photoUrl || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
          sex: data.sex || 'unknown', neutered: Boolean(data.neutered),
          weightKg: data.weightKg ?? '', microchipId: data.microchipId || '',
          birthDateConfidence: data.birthDateConfidence || 'exact',
        });
        owner.setForm({
          countryProfile: data.countryProfile || 'AR', city: data.city || '',
          timezone: data.timezone || '', ownerPhone: data.ownerPhone || '',
        });
        vet.setForm({
          hasVeterinarian: Boolean(data.hasVeterinarian),
          veterinarianName: data.veterinarianName || '', veterinarianPhone: data.veterinarianPhone || '',
          allergies: (data.allergies || []).join(', '), conditions: (data.conditions || []).join(', '),
        });
      })
      .catch(() => setLoadError('No se pudo cargar la ficha del perro.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogId]);

  // Medidor de "¿cuánto conocemos a tu perro?" — en vivo.
  const checks = [
    !!dog.form.name,
    !!dog.form.breed,
    !!dog.form.photoUrl,
    !!dog.form.dateOfBirth && dog.form.birthDateConfidence !== 'unknown',
    dog.form.sex && dog.form.sex !== 'unknown',
    dog.form.weightKg !== '' && dog.form.weightKg != null,
    !!dog.form.microchipId,
    !!owner.form.city,
    !!owner.form.ownerPhone,
    vet.form.hasVeterinarian ? !!vet.form.veterinarianName : false,
    !!vet.form.allergies || !!vet.form.conditions,
  ];
  const pct = useMemo(() => {
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, checks);

  // Fija el % base al terminar de cargar, para no celebrar en falso al guardar.
  useEffect(() => { if (!loading) prevPct.current = pct; }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(section, payload) {
    section.setError('');
    section.setSuccess(false);
    section.setSaving(true);
    try {
      await updateDog(dogId, payload);
      section.setSuccess(true);
      // Celebración si cruzamos a 100% al guardar.
      if (pct >= 100 && prevPct.current < 100) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 2600);
      }
      prevPct.current = pct;
    } catch (err) {
      section.setError(err.response?.data?.message || 'No se pudo guardar.');
    } finally {
      section.setSaving(false);
    }
  }

  const saveDog = (e) => { e.preventDefault(); save(dog, {
    name: dog.form.name, breed: dog.form.breed, photoUrl: dog.form.photoUrl || null,
    dateOfBirth: dog.form.dateOfBirth || undefined, sex: dog.form.sex, neutered: dog.form.neutered,
    weightKg: dog.form.weightKg === '' ? null : Number(dog.form.weightKg),
    microchipId: dog.form.microchipId, birthDateConfidence: dog.form.birthDateConfidence,
  }); };

  const saveOwner = (e) => { e.preventDefault(); save(owner, {
    countryProfile: owner.form.countryProfile, city: owner.form.city,
    timezone: owner.form.timezone, ownerPhone: owner.form.ownerPhone,
  }); };

  const saveVet = (e) => { e.preventDefault(); save(vet, {
    hasVeterinarian: vet.form.hasVeterinarian,
    veterinarianName: vet.form.veterinarianName, veterinarianPhone: vet.form.veterinarianPhone,
    allergies: vet.form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
    conditions: vet.form.conditions.split(',').map((s) => s.trim()).filter(Boolean),
  }); };

  if (loading) return <div className="page"><p>Cargando...</p></div>;
  if (loadError) return <div className="page"><p className="server-error">{loadError}</p></div>;

  const name = dog.form.name || 'tu perro';
  const initial = (dog.form.name || '?').charAt(0).toUpperCase();

  return (
    <div className="dogedit-page">
      <BackLink to="/dogs" label="Mis perros" />

      {/* ── Hero + medidor ─────────────────────────────────── */}
      <div className="dogedit-hero">
        <div className="dogedit-avatar-wrap">
          {dog.form.photoUrl
            ? <img className="dogedit-avatar" src={dog.form.photoUrl} alt={name} />
            : <div className="dogedit-avatar-ph">{initial}</div>}
        </div>
        <div>
          <button type="button" className="dogedit-photo-btn" onClick={() => setShowPhoto((v) => !v)}>
            {dog.form.photoUrl ? '📸 Cambiar foto' : '📸 Agregar foto'}
          </button>
        </div>
        {showPhoto && (
          <input
            className="dogedit-photo-input" placeholder="Pegá la URL de una foto (https://...)"
            value={dog.form.photoUrl} onChange={dog.field('photoUrl')}
          />
        )}

        <h1 className="dogedit-name">{name}</h1>
        <p className="dogedit-sub">{dog.form.breed || 'Sumá la raza para conocerlo mejor'}</p>

        <div className="dogedit-meter-top">
          <span className="dogedit-meter-label">Conocemos a {name} al</span>
          <span className="dogedit-meter-pct">{pct}%</span>
        </div>
        <div className="dogedit-track">
          <div className="dogedit-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="dogedit-meter-msg">{meterMessage(pct, name)}</p>
      </div>

      {/* ── Sobre el perro ─────────────────────────────────── */}
      <form onSubmit={saveDog} className="dogedit-card">
        <div className="dogedit-card-head">
          <span className="dogedit-card-icon dogedit-icon-dog">🐶</span>
          <div><h2>Sobre {name}</h2><p>Lo esencial para cuidarlo bien</p></div>
        </div>

        <div className="dogedit-grid">
          <div className="dogedit-field"><label>Nombre</label><input value={dog.form.name} onChange={dog.field('name')} required /></div>
          <div className="dogedit-field"><label>Raza</label><input value={dog.form.breed} onChange={dog.field('breed')} required /></div>
          <div className="dogedit-field"><label>Fecha de nacimiento</label><input type="date" value={dog.form.dateOfBirth} onChange={dog.field('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} /></div>
          <div className="dogedit-field"><label>Certeza de la fecha</label>
            <select value={dog.form.birthDateConfidence} onChange={dog.field('birthDateConfidence')}>
              <option value="exact">Exacta</option><option value="estimated">Estimada</option><option value="unknown">No la sé</option>
            </select>
          </div>
          <div className="dogedit-field"><label>Sexo</label>
            <select value={dog.form.sex} onChange={dog.field('sex')}>
              <option value="unknown">No especificado</option><option value="male">Macho</option><option value="female">Hembra</option>
            </select>
          </div>
          <div className="dogedit-field"><label>Peso (kg)</label><input type="number" min="0.1" max="200" step="0.1" value={dog.form.weightKg} onChange={dog.field('weightKg')} placeholder="Ej: 12.5" /></div>
          <div className="dogedit-field dogedit-full"><label>Microchip</label><input value={dog.form.microchipId} onChange={dog.field('microchipId')} placeholder="Número de microchip (opcional)" /></div>
        </div>

        <div className="dogedit-switchrow">
          <span>¿Está castrado/a?</span>
          <Switch checked={dog.form.neutered} onChange={(v) => { dog.setForm((p) => ({ ...p, neutered: v })); dog.setSuccess(false); }} />
        </div>

        <div className="dogedit-foot">
          <button type="submit" className="dogedit-save" disabled={dog.saving}>{dog.saving ? 'Guardando…' : 'Guardar'}</button>
          {dog.success && <span className="dogedit-saved">¡Guardado! 🎉</span>}
          {dog.error && <span className="dogedit-err">{dog.error}</span>}
        </div>
      </form>

      {/* ── Tu contacto ────────────────────────────────────── */}
      <form onSubmit={saveOwner} className="dogedit-card">
        <div className="dogedit-card-head">
          <span className="dogedit-card-icon dogedit-icon-owner">🏠</span>
          <div><h2>Tu contacto</h2><p>Para la ficha pública del QR si {name} se pierde</p></div>
        </div>

        <div className="dogedit-grid">
          <div className="dogedit-field"><label>País</label>
            <select value={owner.form.countryProfile} onChange={owner.field('countryProfile')}>
              <option value="AR">Argentina</option><option value="UY">Uruguay</option>
            </select>
          </div>
          <div className="dogedit-field"><label>Ciudad</label><input value={owner.form.city} onChange={owner.field('city')} placeholder="Ej: Buenos Aires" /></div>
          <div className="dogedit-field dogedit-full"><label>Teléfono de contacto</label>
            <input type="tel" value={owner.form.ownerPhone} onChange={owner.field('ownerPhone')} placeholder="Ej: +54 9 11 1234 5678" />
            <p className="dogedit-hint">Aparece en la ficha pública del QR para que te contacten si encuentran a {name}.</p>
          </div>
          <div className="dogedit-field dogedit-full"><label>Zona horaria</label><input value={owner.form.timezone} onChange={owner.field('timezone')} placeholder="Ej: America/Argentina/Buenos_Aires" /></div>
        </div>

        <div className="dogedit-foot">
          <button type="submit" className="dogedit-save" disabled={owner.saving}>{owner.saving ? 'Guardando…' : 'Guardar'}</button>
          {owner.success && <span className="dogedit-saved">¡Guardado! 🎉</span>}
          {owner.error && <span className="dogedit-err">{owner.error}</span>}
        </div>
      </form>

      {/* ── Salud y veterinario ────────────────────────────── */}
      <form onSubmit={saveVet} className="dogedit-card">
        <div className="dogedit-card-head">
          <span className="dogedit-card-icon dogedit-icon-vet">🩺</span>
          <div><h2>Salud y veterinario</h2><p>Lo que ayuda en una urgencia</p></div>
        </div>

        <div className="dogedit-switchrow">
          <span>¿Tiene veterinario de cabecera?</span>
          <Switch checked={vet.form.hasVeterinarian} onChange={(v) => { vet.setForm((p) => ({ ...p, hasVeterinarian: v })); vet.setSuccess(false); }} />
        </div>

        {vet.form.hasVeterinarian && (
          <div className="dogedit-grid">
            <div className="dogedit-field"><label>Nombre del veterinario</label><input value={vet.form.veterinarianName} onChange={vet.field('veterinarianName')} placeholder="Nombre o clínica" /></div>
            <div className="dogedit-field"><label>Teléfono del veterinario</label><input type="tel" value={vet.form.veterinarianPhone} onChange={vet.field('veterinarianPhone')} placeholder="Ej: +54 11 4800 0000" /></div>
          </div>
        )}

        <div className="dogedit-grid" style={{ marginTop: 12 }}>
          <div className="dogedit-field dogedit-full"><label>Alergias conocidas</label><input value={vet.form.allergies} onChange={vet.field('allergies')} placeholder="Separadas por coma: pollo, maíz" /></div>
          <div className="dogedit-field dogedit-full"><label>Condiciones crónicas</label><input value={vet.form.conditions} onChange={vet.field('conditions')} placeholder="Separadas por coma: hipotiroidismo, displasia" /></div>
        </div>

        <div className="dogedit-foot">
          <button type="submit" className="dogedit-save" disabled={vet.saving}>{vet.saving ? 'Guardando…' : 'Guardar'}</button>
          {vet.success && <span className="dogedit-saved">¡Guardado! 🎉</span>}
          {vet.error && <span className="dogedit-err">{vet.error}</span>}
        </div>
      </form>

      {celebrate && (
        <div className="dogedit-celebrate">
          <div className="big">🏆🐾</div>
          <p>¡Ficha completa! Conocés a {name} de pies a cola</p>
        </div>
      )}
    </div>
  );
}
