import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminPartners, createAdminPartner, updateAdminPartner, rotatePartnerApiKey, invitePartnerAdmin } from '../../services/api';

// Plantillas de contrato por tipo, ancladas al pricing one-pager (USD).
// Sirven como punto de partida realista al crear: el admin ajusta lo que necesite.
const CONTRACT_PRESETS = {
  insurer: { setupFee: 3500, pricePerActivePet: 0.9, pricePerLead: 10, pricePerConversion: 40, currency: 'USD', billingDay: 1 },
  fintech: { setupFee: 1500, pricePerActivePet: 0.9, pricePerLead: 10, pricePerConversion: 40, currency: 'USD', billingDay: 1 },
  bank: { setupFee: 5000, pricePerActivePet: 0.9, pricePerLead: 10, pricePerConversion: 40, currency: 'USD', billingDay: 1 },
  vet: { setupFee: 0, pricePerActivePet: 0, pricePerLead: 0, pricePerConversion: 0, currency: 'USD', billingDay: 1 },
};

const emptyFor = (type) => ({
  name: '', slug: '', type, status: 'active', webhookUrl: '',
  branding: { appName: '', primaryColor: '#4f8ef7', secondaryColor: '#3370d4', logoUrl: '' },
  contract: { ...CONTRACT_PRESETS[type] },
  billing: { autoCharge: false, paymentToken: '', payerEmail: '' },
});

const EMPTY = emptyFor('insurer');

const TYPES = [['insurer', 'Aseguradora'], ['fintech', 'Fintech'], ['bank', 'Banco'], ['vet', 'Veterinaria']];

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState(''); // se muestra una sola vez
  const [inviting, setInviting] = useState(null); // partnerId con el form de invitación abierto
  const [invite, setInvite] = useState({ email: '', name: '' });
  const [inviteResult, setInviteResult] = useState(null);

  const top = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const nested = (g, k, isNum) => (e) => setForm((f) => ({ ...f, [g]: { ...f[g], [k]: isNum ? Number(e.target.value) : e.target.value } }));

  // Al crear: cambiar el tipo recarga la plantilla de contrato sugerida para ese tipo.
  // Al editar: solo cambia el tipo, sin tocar los valores ya pactados.
  const changeType = (e) => {
    const type = e.target.value;
    setForm((f) => (editingId ? { ...f, type } : { ...f, type, contract: { ...CONTRACT_PRESETS[type] } }));
  };

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
      contract: { setupFee: 0, pricePerActivePet: 0, pricePerLead: 0, pricePerConversion: 0, currency: 'UYU', billingDay: 1, ...(p.contract || {}) },
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

  function openInvite(p) {
    setInviting(inviting === p.id ? null : p.id);
    setInvite({ email: '', name: '' });
    setInviteResult(null);
  }

  async function sendInvite(p, e) {
    e.preventDefault();
    setError('');
    setInviteResult(null);
    try {
      const { data } = await invitePartnerAdmin(p.id, invite);
      setInviteResult({ partnerId: p.id, ...data });
      setInvite({ email: '', name: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo invitar.');
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
          <select value={form.type} onChange={changeType}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {!editingId && <small style={{ color: 'var(--color-muted)' }}>Precarga una plantilla de contrato sugerida (ajustable).</small>}
        </div>

        <h3 style={{ marginTop: '10px' }}>Branding</h3>
        <div className="field"><label>Nombre de app</label><input value={form.branding.appName} onChange={nested('branding', 'appName')} placeholder="PetSeguro" /></div>
        <div className="field"><label>Color primario</label><input type="color" value={form.branding.primaryColor || '#4f8ef7'} onChange={nested('branding', 'primaryColor')} /></div>
        <div className="field"><label>Color secundario</label><input type="color" value={form.branding.secondaryColor || '#3370d4'} onChange={nested('branding', 'secondaryColor')} /></div>
        <div className="field"><label>Logo URL</label><input value={form.branding.logoUrl} onChange={nested('branding', 'logoUrl')} /></div>

        <h3 style={{ marginTop: '10px' }}>Contrato</h3>
        <div className="field"><label>Setup fee</label><input type="number" value={form.contract.setupFee} onChange={nested('contract', 'setupFee', true)} /></div>
        <div className="field"><label>Precio por mascota activa</label><input type="number" value={form.contract.pricePerActivePet} onChange={nested('contract', 'pricePerActivePet', true)} /></div>
        <div className="field"><label>Precio por lead (CPL)</label><input type="number" value={form.contract.pricePerLead} onChange={nested('contract', 'pricePerLead', true)} /></div>
        <div className="field"><label>Precio por póliza convertida (CPA)</label><input type="number" value={form.contract.pricePerConversion} onChange={nested('contract', 'pricePerConversion', true)} /></div>
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
                  {p.admins && p.admins.length > 0 ? (
                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.admins.map((a) => (
                        <span key={a.email} style={{ fontSize: '.74rem', padding: '2px 8px', borderRadius: '999px', background: a.pending ? '#fffbeb' : '#ecfdf5', color: a.pending ? '#92400e' : '#065f46', border: `1px solid ${a.pending ? '#fde68a' : '#a7f3d0'}` }}>
                          {a.email} · {a.pending ? '⏳ invitación pendiente' : `✓ activo${a.lastLoginAt ? ` · ${new Date(a.lastLoginAt).toLocaleDateString('es-UY')}` : ''}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '.74rem', color: 'var(--color-muted)', marginTop: '4px' }}>Sin partner_admin asignado.</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(p)}>Editar</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => openInvite(p)}>Invitar admin</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => rotate(p)}>Rotar key</button>
                </div>

                {inviting === p.id && (
                  <form onSubmit={(e) => sendInvite(p, e)} style={{ flexBasis: '100%', marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="field" style={{ margin: 0, flex: '1 1 200px' }}>
                      <label>Email del partner_admin</label>
                      <input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="admin@aseguradora.com" required />
                    </div>
                    <div className="field" style={{ margin: 0, flex: '1 1 140px' }}>
                      <label>Nombre (opcional)</label>
                      <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-sm">Enviar invitación</button>
                  </form>
                )}
                {inviteResult?.partnerId === p.id && (
                  <div style={{ flexBasis: '100%', marginTop: '8px', fontSize: '.82rem' }}>
                    {inviteResult.emailed
                      ? <p className="success-message">Invitación enviada a {inviteResult.email} ✓</p>
                      : (
                        <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '10px' }}>
                          <strong>Email no configurado — pasale este link de acceso (vence en 15 min):</strong>
                          <code style={{ display: 'block', marginTop: '6px', wordBreak: 'break-all' }}>{inviteResult.magicUrl}</code>
                        </div>
                      )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
