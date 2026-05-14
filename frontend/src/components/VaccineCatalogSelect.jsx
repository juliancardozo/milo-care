import { useEffect, useState } from 'react';
import { getVaccineCatalog } from '../services/api';

const GROUP_ORDER = ['core_mandatory', 'core', 'regional_core', 'elective'];

/**
 * Combo selector backed by the vaccine catalog.
 *
 * Props:
 *   country      — 'AR' | 'UY' (default 'AR')
 *   value        — current vaccineName string
 *   onChange(meta) — called with { vaccineName, catalogId, isCalendarRequired,
 *                                   antigenGroup, notes, route } or null when "other"
 *   disabled     — bool
 */
export default function VaccineCatalogSelect({ country = 'AR', value = '', onChange, disabled = false }) {
  const [groups, setGroups] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    getVaccineCatalog(country)
      .then(({ data }) => setGroups(data.groups))
      .catch(() => setLoadError(true));
  }, [country]);

  function handleSelect(e) {
    const val = e.target.value;
    if (val === '__other__') {
      setShowCustom(true);
      onChange({ vaccineName: '', catalogId: null, isCalendarRequired: false, antigenGroup: '', notes: '', route: [] });
      return;
    }
    setShowCustom(false);
    setCustomName('');
    if (!val) { onChange(null); return; }

    // Find the selected vaccine in groups
    for (const group of Object.values(groups || {})) {
      const vaccine = group.vaccines.find((v) => v.id === val);
      if (vaccine) {
        onChange({
          vaccineName: vaccine.name,
          catalogId: vaccine.id,
          isCalendarRequired: Boolean(vaccine.senasaRequired),
          antigenGroup: (vaccine.antigens || []).join(' + '),
          notes: vaccine.notes || '',
          route: vaccine.route || [],
        });
        return;
      }
    }
  }

  function handleCustomChange(e) {
    setCustomName(e.target.value);
    onChange({ vaccineName: e.target.value, catalogId: null, isCalendarRequired: false, antigenGroup: '', notes: '', route: [] });
  }

  // Determine selected <select> value from current vaccineName
  const selectedId = (() => {
    if (showCustom) return '__other__';
    if (!groups) return '';
    for (const group of Object.values(groups)) {
      const match = group.vaccines.find((v) => v.name === value);
      if (match) return match.id;
    }
    return value ? '__other__' : '';
  })();

  if (loadError) {
    return (
      <div className="field">
        <label htmlFor="vax-name-fallback">Vacuna</label>
        <input
          id="vax-name-fallback"
          value={value}
          onChange={(e) => onChange({ vaccineName: e.target.value, catalogId: null, isCalendarRequired: false, antigenGroup: '', notes: '', route: [] })}
          placeholder="Nombre de la vacuna"
          disabled={disabled}
        />
      </div>
    );
  }

  if (!groups) {
    return <div className="field"><label>Vacuna</label><input disabled placeholder="Cargando catálogo…" /></div>;
  }

  return (
    <div className="vaccine-catalog-select">
      <div className="field">
        <label htmlFor="vax-catalog">Vacuna</label>
        <select
          id="vax-catalog"
          value={selectedId}
          onChange={handleSelect}
          disabled={disabled}
          required
        >
          <option value="">— Seleccioná una vacuna —</option>

          {GROUP_ORDER.filter((g) => groups[g]).map((groupKey) => {
            const group = groups[groupKey];
            return (
              <optgroup key={groupKey} label={group.label}>
                {group.vaccines.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.senasaRequired ? '⚠ ' : ''}{v.name}
                  </option>
                ))}
              </optgroup>
            );
          })}

          <optgroup label="Otra">
            <option value="__other__">Otra vacuna (ingreso libre)</option>
          </optgroup>
        </select>
      </div>

      {showCustom && (
        <div className="field">
          <label htmlFor="vax-custom-name">Nombre de la vacuna</label>
          <input
            id="vax-custom-name"
            value={customName}
            onChange={handleCustomChange}
            placeholder="Ej: Coronavirus, Herpesvirus…"
            disabled={disabled}
            required
          />
        </div>
      )}

      {/* Info panel for the selected vaccine */}
      {selectedId && selectedId !== '__other__' && (() => {
        let selected = null;
        for (const group of Object.values(groups)) {
          selected = group.vaccines.find((v) => v.id === selectedId);
          if (selected) break;
        }
        if (!selected) return null;
        return (
          <div className="vaccine-info-panel">
            {selected.senasaRequired && (
              <span className="badge-senasa">⚠ Obligatoria SENASA / MGAP</span>
            )}
            {selected.antigens?.length > 0 && (
              <p className="vaccine-info-antigens">Antígenos: {selected.antigens.join(' · ')}</p>
            )}
            {selected.notes && <p className="vaccine-info-note">{selected.notes}</p>}
          </div>
        );
      })()}
    </div>
  );
}
