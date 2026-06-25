import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminPartners, createAdminPartner, updateAdminPartner, rotatePartnerApiKey } from '../../services/api';

const EMPTY = {
  name: '', slug: '', type: 'insurer', status: 'active', webhookUrl: '',
  branding: { appName: '', primaryColor: '#4f8ef7', secondaryColor: '', logoUrl: '' },
  contract: { setupFee: 0, pricePerActivePet: 0, currency: 'UYU', billingDay: 1 },
  billing: { autoCharge: false, paymentToken: '', payerEmail: '' },
};

const TYPES = [['insurer', 'Aseguradora'], ['fintech', 'Fintech'], ['bank', 'Banco'], ['vet', 'Veterinaria']];

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState(''); // se muestra una sola vez

  const top = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const nested = (g, k, isNum) => (e) => setForm((f) => ({ ...f, [g]: { ...f[g], [k]: isNum ? Number(e.target.value) : e.target.value } }));

  function load() {
    setLoading(true);
    getAdminPartners()
      .then(({ data }) => setPartners(data.partners || []))
      .catch(() => setError('No se pudieron cargar los partners.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setApiKey('');
    setForm({
      name: p.name, slug: p.slug, type: p.type, status: p.status, webhookUrl: p.webhookUrl || '',
      branding: { appName: '', primaryColor: '#4f8ef7', secondaryColor: '', logoUrl: '', ...(p.branding || {}) },
      contract: { setupFee: 0, pricePerActivePet: 0, currency: 'UYU', billingDay: 1, ...(p.contract || {}) },
      billing: { autoCharge: false, paymentToken: '', payerEmail: '', ...(p.billing || {}) },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY); setApiKey(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateAdminPartner(editingId, form);
        cancelEdit();
      } else {
        const { data } = await createAdminPartner(form);
        setApiKey(data.apiKey || '');
        setForm(EMPTY);
      }
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el partner.');
    } finally {
      setSaving(false);
    }
  }

  async function rotate(p) {
    if (!window.confirm(`Rotar la API key de "${p.name}"? La key actual deja de funcionar.`)) return;
    try {
      const { data } = await rotatePartnerApiKey(p.id);
      setApiKey(data.apiKey || '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo rotar la key.');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Partners (B2B2C)</h1>
        <Link to="/admin" className="btn-secondary btn-sm">← Admin</Link>
      </header>

      {apiKey && (
        <div className="card" style={{ borderLeft: '4px solid #22c55e', marginBottom: '12px' }}>
          <strong>API key generada — copiala ahora, no se vuelve a mostrar:</strong>
          <code style={{ display: 'block', marginTop: '6px', wordBreak: 'break-all', background: 'var(--color-bg)', padding: '8px', borderRadius: '6px' }}>{apiKey}</code>
        </div>
      )}
      {error && <p className="server-error">{error}</p>}

      {/* Crear / editar */}
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '16px' }}>
        <h2>{editingId ? 'Editar partner' : 'Nuevo partner'}</h2>
        <div className="field"><label>Nombre</label><input value={form.name} onChange={top('name')} required /></div>
        <div className="field"><label>Slug (white-label)</label><input value={form.slug} onChange={top('slug')} placeholder="acme" required={!editingId} /></div>
        <div className="field">
          <label>Tipo</label>
          <select value={form.type} onChange={top('type')}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>

        <h3 style={{ marginTop: '10px' }}>Branding</h3>
        <div className="field"><label>Nombre de app</label><input value={form.branding.appName} onChange={nested('branding', 'appName')} placeholder="PetSeguro" /></div>
        <div className="field"><label>Color primario</label><input type="color" value={form.branding.primaryColor || '#4f8ef7'} onChange={nested('branding', 'primaryColor')} /></div>
        <div className="field"><label>Color secundario</label><input type="color" value={form.branding.secondaryColor || '#3370d4'} onChange={nested('branding', 'secondaryColor')} /></div>
        <div className="field"><label>Logo URL</label><input value={form.branding.logoUrl} onChange={nested('branding', 'logoUrl')} /></div>

        <h3 style={{ marginTop: '10px' }}>Contrato</h3>
        <div className="field"><label>Setup fee</label><input type="number" value={form.contract.setupFee} onChange={nested('contract', 'setupFee', true)} /></div>
        <div className="field"><label>Precio por mascota activa</label><input type="number" value={form.contract.pricePerActivePet} onChange={nested('contract', 'pricePerActivePet', true)} /></div>
        <div className="field">
          <label>Moneda</label>
          <select value={form.contract.currency} onChange={nested('contract', 'currency')}><option>UYU</option><option>ARS</option><option>USD</option></select>
        </div>
        <div className="field"><label>Día de facturación (1–28)</label><input type="number" min="1" max="28" value={form.contract.billingDay} onChange={nested('contract', 'billingDay', true)} /></div>

        <h3 style={{ marginTop: '10px' }}>Cobro automático</h3>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="checkbox" checked={form.billing.autoCharge} onChange={(e) => setForm((f) => ({ ...f, billing: { ...f.billing, autoCharge: e.target.checked } }))} />
          Cobrar automáticamente al partner
        </label>
        {form.billing.autoCharge && (
          <>
            <div className="field"><label>Payment token (Mercado Pago)</label><input value={form.billing.paymentToken} onChange={nested('billing', 'paymentToken')} /></div>
            <div className="field"><label>Email de pago</label><input value={form.billing.payerEmail} onChange={nested('billing', 'payerEmail')} /></div>
          </>
        )}

        <div className="field"><label>Webhook URL</label><input value={form.webhookUrl} onChange={top('webhookUrl')} placeholder="https://partner.com/webhook" /></div>

        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Guardando…' : (editingId ? 'Guardar cambios' : 'Crear partner')}</button>
          {editingId && <button type="button" className="btn-secondary" onClick={cancelEdit} style={{ marginLeft: '8px' }}>Cancelar</button>}
        </div>
      </form>

      {/* Listado */}
      <section className="card">
        <h2>Partners ({partners.length})</h2>
        {loading ? <p>Cargando…</p> : partners.length === 0 ? <p className="list-empty">Sin partners todavía.</p> : (
          <ul className="record-list">
            {partners.map((p) => (
              <li key={p.id} className="record-item">
                <div className="record-info">
                  <h3>{p.name} <span style={{ fontSize: '.75rem', color: 'var(--color-muted)' }}>· {p.type} · /{p.slug}</span></h3>
                  <p style={{ fontSize: '.8rem', color: 'var(--color-muted)' }}>
                    {p.status} · {p.contract?.pricePerActivePet || 0} {p.contract?.currency}/activa · {p.billing?.autoCharge ? 'auto-cobro' : 'manual'} · {p.hasApiKey ? 'API key ✓' : 'sin key'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(p)}>Editar</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => rotate(p)}>Rotar key</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
