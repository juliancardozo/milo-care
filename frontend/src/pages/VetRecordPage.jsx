import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getVetRecord, validateVetEvent } from '../services/api';
import '../styles/vet-share.css';

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');

function ageFromDob(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  return years >= 1 ? `${years} ${years === 1 ? 'año' : 'años'}` : `${months} ${months === 1 ? 'mes' : 'meses'}`;
}

export default function VetRecordPage() {
  const { token } = useParams();
  const [rec, setRec] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(null);

  useEffect(() => {
    getVetRecord(token)
      .then(({ data }) => setRec(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function validate(kind, id) {
    setValidating(`${kind}:${id}`);
    try {
      const { data } = await validateVetEvent(token, { kind, id });
      setRec((prev) => {
        const key = kind === 'vaccination' ? 'vaccinations' : 'dewormingHistory';
        return {
          ...prev,
          [key]: prev[key].map((it) => (it.id === id ? { ...it, requiresVetValidation: false, vetValidatedAt: data.vetValidatedAt } : it)),
        };
      });
    } catch { /* noop */ } finally { setValidating(null); }
  }

  if (loading) return <div className="vrec-page"><div className="vrec-loading">Cargando expediente…</div></div>;
  if (error || !rec) {
    return (
      <div className="vrec-page">
        <div className="vrec-error">
          <span aria-hidden="true">🔒</span>
          <h1>Link no disponible</h1>
          <p>Este link de expediente no existe o fue revocado por el tutor.</p>
        </div>
      </div>
    );
  }

  const { dog, tutor } = rec;

  const ValidatableList = ({ items, kind, title, emoji, renderMeta }) => (
    items.length > 0 && (
      <section className="vrec-section">
        <h2>{emoji} {title}</h2>
        <ul className="vrec-list">
          {items.map((it) => (
            <li key={it.id} className="vrec-item">
              <div className="vrec-item-main">
                <strong>{kind === 'vaccination' ? it.vaccineName : it.productName}</strong>
                <span className="vrec-meta">{renderMeta(it)}</span>
              </div>
              {it.vetValidatedAt ? (
                <span className="vrec-validated">✓ Validado</span>
              ) : it.requiresVetValidation ? (
                <button className="vrec-validate" onClick={() => validate(kind, it.id)} disabled={validating === `${kind}:${it.id}`}>
                  {validating === `${kind}:${it.id}` ? '…' : 'Validar'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    )
  );

  return (
    <div className="vrec-page">
      <div className="vrec-brand"><span aria-hidden="true">🐾</span> Milo Care · Expediente compartido</div>

      <header className="vrec-dog">
        {dog.photoUrl
          ? <img src={dog.photoUrl} alt={dog.name} className="vrec-avatar" />
          : <div className="vrec-avatar vrec-avatar-ph">{dog.name.charAt(0).toUpperCase()}</div>}
        <div>
          <h1>{dog.name}</h1>
          <p className="vrec-dog-meta">
            {[dog.breed, ageFromDob(dog.dateOfBirth), dog.sex === 'male' ? 'Macho' : dog.sex === 'female' ? 'Hembra' : null, dog.weightKg ? `${dog.weightKg} kg` : null]
              .filter(Boolean).join(' · ')}
          </p>
          {tutor.name && <p className="vrec-tutor">Tutor: {tutor.name}</p>}
        </div>
      </header>

      {(dog.allergies?.length > 0 || dog.conditions?.length > 0) && (
        <section className="vrec-section vrec-flags">
          {dog.allergies?.length > 0 && <p><strong>Alergias:</strong> {dog.allergies.join(', ')}</p>}
          {dog.conditions?.length > 0 && <p><strong>Condiciones:</strong> {dog.conditions.join(', ')}</p>}
        </section>
      )}

      <ValidatableList
        items={rec.vaccinations} kind="vaccination" title="Vacunas" emoji="💉"
        renderMeta={(v) => `Aplicada ${fmt(v.dateAdministered)}${v.nextDueDate ? ` · refuerzo ${fmt(v.nextDueDate)}` : ''}`}
      />
      <ValidatableList
        items={rec.dewormingHistory} kind="deworming" title="Desparasitación" emoji="🪱"
        renderMeta={(d) => `${fmt(d.dateAdministered)}${d.nextDueDate ? ` · próxima ${fmt(d.nextDueDate)}` : ''}`}
      />

      {rec.medications.length > 0 && (
        <section className="vrec-section">
          <h2>💊 Medicación activa</h2>
          <ul className="vrec-list">
            {rec.medications.map((m) => (
              <li key={m.id} className="vrec-item">
                <div className="vrec-item-main">
                  <strong>{m.medicationName}</strong>
                  <span className="vrec-meta">{m.dosage}{m.oneTime ? ' · dosis única' : m.frequencyHours ? ` · cada ${m.frequencyHours} h` : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rec.symptoms.length > 0 && (
        <section className="vrec-section">
          <h2>🩺 Síntomas registrados</h2>
          <ul className="vrec-list">
            {rec.symptoms.map((s) => (
              <li key={s.id} className="vrec-item">
                <div className="vrec-item-main">
                  <strong>{s.description}</strong>
                  <span className="vrec-meta">{fmt(s.dateObserved)} · {s.severity}{s.resolved ? ' · resuelto' : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rec.consultations.length > 0 && (
        <section className="vrec-section">
          <h2>📋 Consultas</h2>
          <ul className="vrec-list">
            {rec.consultations.map((c) => (
              <li key={c.id} className="vrec-item">
                <div className="vrec-item-main">
                  <strong>{c.reason}</strong>
                  <span className="vrec-meta">{fmt(c.dateOfConsult)}{c.vetName ? ` · ${c.vetName}` : ''}{c.findings ? ` — ${c.findings}` : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="vrec-disclaimer">
        Expediente de solo lectura compartido por el tutor vía Milo Care. La información es
        provista por el tutor y no reemplaza el criterio profesional veterinario.
      </p>
    </div>
  );
}
