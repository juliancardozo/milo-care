import { useEffect, useState } from 'react';
import { getAppointmentCatalog } from '../services/api';

const GROUP_ORDER = ['vaccination', 'preventive', 'follow_up', 'emergency'];

/**
 * Combo selector backed by the appointment catalog.
 *
 * Props:
 *   value        — current title string
 *   onChange(meta) — { title, catalogId, isWsavaRecommended, appointmentType,
 *                      checklist, notes, urgency }
 *   disabled
 */
export default function AppointmentCatalogSelect({ value = '', onChange, disabled = false }) {
  const [groups, setGroups] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  useEffect(() => {
    getAppointmentCatalog()
      .then(({ data }) => setGroups(data.groups))
      .catch(() => setLoadError(true));
  }, []);

  function findSelected(id) {
    if (!groups) return null;
    for (const group of Object.values(groups)) {
      const item = group.items.find((a) => a.id === id);
      if (item) return item;
    }
    return null;
  }

  function handleSelect(e) {
    const val = e.target.value;
    if (val === '__other__') {
      setShowCustom(true);
      onChange({ title: '', catalogId: null, isWsavaRecommended: false, appointmentType: '', checklist: [], notes: '', urgency: false });
      return;
    }
    setShowCustom(false);
    setCustomTitle('');
    if (!val) { onChange(null); return; }
    const item = findSelected(val);
    if (item) {
      onChange({
        title: item.name,
        catalogId: item.id,
        isWsavaRecommended: item.isWsavaRecommended,
        appointmentType: item.id,
        checklist: item.checklist || [],
        notes: item.notes || '',
        urgency: item.urgency || false,
      });
    }
  }

  function handleCustomChange(e) {
    setCustomTitle(e.target.value);
    onChange({ title: e.target.value, catalogId: null, isWsavaRecommended: false, appointmentType: '', checklist: [], notes: '', urgency: false });
  }

  const selectedId = (() => {
    if (showCustom) return '__other__';
    if (!groups) return '';
    for (const group of Object.values(groups)) {
      const match = group.items.find((a) => a.name === value);
      if (match) return match.id;
    }
    return value ? '__other__' : '';
  })();

  if (loadError) {
    return (
      <div className="field">
        <label htmlFor="appt-title-fallback">Tipo de cita</label>
        <input id="appt-title-fallback" value={value} onChange={(e) => onChange({ title: e.target.value, catalogId: null, isWsavaRecommended: false, appointmentType: '', checklist: [], notes: '', urgency: false })} placeholder="Ej: Control anual" disabled={disabled} />
      </div>
    );
  }

  if (!groups) {
    return <div className="field"><label>Tipo de cita</label><input disabled placeholder="Cargando catálogo…" /></div>;
  }

  const selected = selectedId && selectedId !== '__other__' ? findSelected(selectedId) : null;

  return (
    <div className="appointment-catalog-select">
      <div className="field">
        <label htmlFor="appt-catalog">Tipo de cita</label>
        <select id="appt-catalog" value={selectedId} onChange={handleSelect} disabled={disabled} required>
          <option value="">— Seleccioná el tipo de cita —</option>
          {GROUP_ORDER.filter((g) => groups[g]).map((groupKey) => {
            const group = groups[groupKey];
            return (
              <optgroup key={groupKey} label={group.label}>
                {group.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.urgency ? '🚨 ' : a.isWsavaRecommended ? '✓ ' : ''}{a.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
          <optgroup label="Otra">
            <option value="__other__">Otro tipo (ingreso libre)</option>
          </optgroup>
        </select>
      </div>

      {showCustom && (
        <div className="field">
          <label htmlFor="appt-custom-title">Descripción de la cita</label>
          <input id="appt-custom-title" value={customTitle} onChange={handleCustomChange} placeholder="Ej: Ecografía, análisis de sangre…" disabled={disabled} required />
        </div>
      )}

      {selected && (
        <div className={`appointment-info-panel ${selected.urgency ? 'appt-emergency-panel' : ''}`}>
          {selected.urgency && <p className="appt-urgency-warning">🚨 Concurrir a guardia veterinaria de inmediato</p>}
          {selected.isWsavaRecommended && !selected.urgency && (
            <span className="badge-wsava">✓ Recomendada por WSAVA</span>
          )}
          <p className="appt-frequency">Frecuencia: {selected.frequency}</p>
          {selected.notes && <p className="appt-info-note">{selected.notes}</p>}
          {selected.checklist?.length > 0 && (
            <details className="appt-checklist-preview">
              <summary>Ver checklist ({selected.checklist.length} ítems)</summary>
              <ul>
                {selected.checklist.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
