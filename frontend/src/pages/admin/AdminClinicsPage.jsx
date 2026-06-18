import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListClinics, adminCreateClinic, adminGetClinicPanel } from '../../services/clinicApi';
import WeeklyBars from '../../components/WeeklyBars';
import ClinicQRCard from '../../components/ClinicQRCard';
import { useI18n } from '../../i18n/I18nProvider';
import '../../styles/vet-panel.css';

const EMPTY = {
  name: '', cohort: '', country: 'AR', city: '', whatsapp: '',
  incentivePremiumDays: 30, ownerName: '', ownerEmail: '', ownerPassword: '',
};

export default function AdminClinicsPage() {
  const { t } = useI18n();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState('');
  const [panel, setPanel] = useState(null); // panel de una clínica seleccionada

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function load() {
    setLoading(true);
    adminListClinics()
      .then(({ data }) => setClinics(data.clinics || []))
      .catch(() => setError(t('adminClinics.loadError')))
      .finally(() => setLoading(false));
  }
  useEffect(load, [t]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    setCreatedLink('');
    try {
      const payload = { ...form, incentivePremiumDays: Number(form.incentivePremiumDays) || 0 };
      // Sólo enviar credenciales de vet si se completaron.
      if (!payload.ownerEmail) { delete payload.ownerEmail; delete payload.ownerPassword; delete payload.ownerName; }
      const { data } = await adminCreateClinic(payload);
      setCreatedLink(data.link);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t('adminClinics.createError'));
    } finally {
      setCreating(false);
    }
  }

  async function viewPanel(id) {
    setPanel({ loading: true });
    try {
      const { data } = await adminGetClinicPanel(id);
      setPanel(data);
    } catch {
      setPanel(null);
      setError(t('adminClinics.panelError'));
    }
  }

  return (
    <div className="page ac-page">
      <header className="page-header">
        <h1>{t('adminClinics.title')}</h1>
        <Link to="/admin" className="btn-secondary btn-sm">← Admin</Link>
      </header>

      {error && <p className="server-error">{error}</p>}

      <section className="card ac-form-card">
        <h2>{t('adminClinics.newClinic')}</h2>
        <form onSubmit={handleCreate} className="ac-form">
          <div className="ac-grid">
            <label>{t('adminClinics.name')}<input value={form.name} onChange={set('name')} required /></label>
            <label>{t('adminClinics.cohort')}<input value={form.cohort} onChange={set('cohort')} placeholder="Palermo, San Vicente…" /></label>
            <label>{t('adminClinics.country')}
              <select value={form.country} onChange={set('country')}>
                <option value="AR">AR</option><option value="UY">UY</option>
              </select>
            </label>
            <label>{t('adminClinics.city')}<input value={form.city} onChange={set('city')} /></label>
            <label>{t('adminClinics.whatsapp')}<input value={form.whatsapp} onChange={set('whatsapp')} /></label>
            <label>{t('adminClinics.incentiveDays')}<input type="number" min="0" value={form.incentivePremiumDays} onChange={set('incentivePremiumDays')} /></label>
          </div>
          <p className="ac-section-hint">{t('adminClinics.ownerHint')}</p>
          <div className="ac-grid">
            <label>{t('adminClinics.ownerName')}<input value={form.ownerName} onChange={set('ownerName')} /></label>
            <label>{t('adminClinics.ownerEmail')}<input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} /></label>
            <label>{t('adminClinics.ownerPassword')}<input type="password" value={form.ownerPassword} onChange={set('ownerPassword')} /></label>
          </div>
          <button type="submit" disabled={creating}>{creating ? t('adminClinics.creating') : t('adminClinics.create')}</button>
        </form>
        {createdLink && (
          <p className="ac-created">✅ {t('adminClinics.created')}: <code>{createdLink}</code></p>
        )}
      </section>

      <section className="card">
        <h2>{t('adminClinics.list')}</h2>
        {loading ? (
          <p>{t('adminClinics.loading')}</p>
        ) : clinics.length === 0 ? (
          <p className="vp-empty">{t('adminClinics.empty')}</p>
        ) : (
          <ul className="ac-list">
            {clinics.map((c) => (
              <li key={c._id} className="ac-item">
                <div className="ac-item-body">
                  <span className="ac-item-name">{c.name}</span>
                  <span className="ac-item-meta">
                    {c.cohort ? `${c.cohort} · ` : ''}{c.referidos} {t('adminClinics.referred')} · <code>{c.link}</code>
                  </span>
                </div>
                <button type="button" className="btn-sm btn-secondary" onClick={() => viewPanel(c._id)}>
                  {t('adminClinics.viewPanel')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {panel && !panel.loading && (
        <section className="card vp-embedded">
          <h2 className="vp-section-title">{panel.clinic.name} — {t('vetPanel.impact')}</h2>
          <div className="vp-stats">
            <div className="vp-stat"><span className="vp-stat-num">{panel.stats.referidosTotal}</span><span className="vp-stat-label">{t('vetPanel.referred')}</span></div>
            <div className="vp-stat"><span className="vp-stat-num">{panel.stats.activos}</span><span className="vp-stat-label">{t('vetPanel.active')}</span></div>
            <div className="vp-stat"><span className="vp-stat-num">{panel.stats.alDia}</span><span className="vp-stat-label">{t('vetPanel.upToDateShort')}</span></div>
          </div>
          <WeeklyBars data={panel.weekly} />
          <div style={{ marginTop: 18 }}>
            <ClinicQRCard clinic={panel.clinic} url={panel.link} />
          </div>
        </section>
      )}
    </div>
  );
}
