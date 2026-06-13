import { useI18n } from '../i18n/I18nProvider';
import { COUNTRIES, REGIONS } from '../config/regions';

// Selector de zona: país + región (controlados) + ciudad (texto). Sin coordenadas.
export default function LocationPicker({ value, onChange }) {
  const { t } = useI18n();
  const v = value || { country: '', region: '', city: '' };

  const set = (patch) => onChange({ ...v, ...patch });

  return (
    <div className="location-picker">
      <div className="field">
        <label>{t('location.country')}</label>
        <select
          value={v.country}
          onChange={(e) => set({ country: e.target.value, region: '' })}
        >
          <option value="">{t('location.selectCountry')}</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>{t('location.region')}</label>
        <select
          value={v.region}
          disabled={!v.country}
          onChange={(e) => set({ region: e.target.value })}
        >
          <option value="">{t('location.selectRegion')}</option>
          {(REGIONS[v.country] || []).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>{t('location.city')}</label>
        <input
          type="text"
          value={v.city}
          placeholder={t('location.cityPlaceholder')}
          onChange={(e) => set({ city: e.target.value })}
        />
      </div>
    </div>
  );
}
