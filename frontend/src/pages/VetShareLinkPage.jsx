import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { getDog, getVetShare, createVetShare, revokeVetShare } from '../services/api';
import '../styles/vet-share.css';

export default function VetShareLinkPage() {
  const { dogId } = useParams();
  const [dogName, setDogName] = useState('');
  const [share, setShare] = useState(null); // { active, url, token }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getDog(dogId).then(({ data }) => setDogName(data?.name || '')).catch(() => {});
    getVetShare(dogId)
      .then(({ data }) => setShare(data))
      .catch(() => setShare({ active: false }))
      .finally(() => setLoading(false));
  }, [dogId]);

  async function generate() {
    setBusy(true);
    try {
      const { data } = await createVetShare(dogId);
      setShare(data);
    } finally { setBusy(false); }
  }

  async function revoke() {
    if (!window.confirm('¿Revocar el link? El veterinario dejará de ver el expediente.')) return;
    setBusy(true);
    try {
      await revokeVetShare(dogId);
      setShare({ active: false });
    } finally { setBusy(false); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  }

  const name = dogName || 'tu perro';
  const waText = encodeURIComponent(`Te comparto el expediente de salud de ${name} en Milo Care: ${share?.url || ''}`);

  if (loading) return <div className="vshare-page"><p>Cargando…</p></div>;

  return (
    <div className="vshare-page">
      <BackLink to={`/dogs/${dogId}`} label="Volver" />

      <section className="vshare-hero">
        <span className="vshare-hero-emoji" aria-hidden="true">🏥</span>
        <h1>Compartir con tu veterinario</h1>
        <p>Enviale a tu vet un link de <strong>solo lectura</strong> con el expediente de {name}. Va a poder ver su historial y <strong>validar</strong> las vacunas. Sin que tenga que crear cuenta.</p>
      </section>

      {!share?.active ? (
        <div className="vshare-card vshare-empty">
          <p>Generá un link seguro para compartir el expediente de {name}.</p>
          <button className="vshare-btn" onClick={generate} disabled={busy}>
            {busy ? 'Generando…' : '🔗 Generar link para mi vet'}
          </button>
        </div>
      ) : (
        <div className="vshare-card">
          <label className="vshare-label">Link del expediente</label>
          <div className="vshare-linkrow">
            <input className="vshare-input" value={share.url} readOnly onFocus={(e) => e.target.select()} />
            <button className="vshare-copy" onClick={copy}>{copied ? '✓ Copiado' : 'Copiar'}</button>
          </div>

          <div className="vshare-actions">
            <a className="vshare-btn vshare-wa" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">
              💬 Enviar por WhatsApp
            </a>
            <button className="vshare-btn vshare-revoke" onClick={revoke} disabled={busy}>
              {busy ? '…' : 'Revocar link'}
            </button>
          </div>

          <p className="vshare-note">Cualquiera con el link puede ver el expediente. Si lo revocás, el link deja de funcionar al instante.</p>
        </div>
      )}
    </div>
  );
}
