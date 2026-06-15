import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../store/authSlice';
import BackLink from '../components/BackLink';
import { getDog, getCoTutors, inviteCoTutor, revokeCoTutor, revokeCoTutorInvite } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/vet-share.css';

export default function CoTutorsPage() {
  const { dogId } = useParams();
  const { t } = useI18n();
  const user = useSelector(selectCurrentUser);
  const isPremium = user?.effectiveTier === 'premium';

  const [dogName, setDogName] = useState('');
  const [data, setData] = useState({ cotutores: [], pending: [] });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ownerOnly, setOwnerOnly] = useState(false);
  const [lastInvite, setLastInvite] = useState(null); // { email, url }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getDog(dogId).then(({ data: d }) => setDogName(d?.name || '')).catch(() => {});
    getCoTutors(dogId)
      .then(({ data: d }) => setData(d))
      .catch((err) => { if (err.response?.status === 403) setOwnerOnly(true); })
      .finally(() => setLoading(false));
  }, [dogId]);

  async function refresh() {
    const { data: d } = await getCoTutors(dogId);
    setData(d);
  }

  async function invite(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data: res } = await inviteCoTutor(dogId, email.trim());
      setEmail('');
      setNotice(t('cotutor.inviteSent', { email: res.email }));
      setLastInvite({ email: res.email, url: res.url });
      setCopied(false);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || t('cotutor.inviteError'));
    } finally {
      setBusy(false);
    }
  }

  // Regenera la invitación de un pendiente para volver a mostrar/copiar su link
  // (el token se guarda hasheado, así que reinvitar es la forma de recuperarlo).
  async function resendPending(em) {
    setError('');
    setBusy(true);
    try {
      const { data: res } = await inviteCoTutor(dogId, em);
      setLastInvite({ email: res.email, url: res.url });
      setCopied(false);
      setNotice(t('cotutor.inviteSent', { email: res.email }));
    } catch (err) {
      setError(err.response?.data?.message || t('cotutor.inviteError'));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!lastInvite?.url) return;
    try {
      await navigator.clipboard.writeText(lastInvite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* noop */ }
  }

  async function removeCotutor(userId) {
    if (!window.confirm(t('cotutor.confirmRevoke'))) return;
    setBusy(true);
    try { await revokeCoTutor(dogId, userId); await refresh(); }
    finally { setBusy(false); }
  }

  async function cancelInvite(em) {
    setBusy(true);
    try { await revokeCoTutorInvite(dogId, em); await refresh(); }
    finally { setBusy(false); }
  }

  const name = dogName || 'tu perro';
  const waText = encodeURIComponent(t('cotutor.waMessage', { dog: name, url: lastInvite?.url || '' }));

  if (loading) return <div className="vshare-page"><p>{t('common.loading')}</p></div>;

  return (
    <div className="vshare-page">
      <BackLink to={`/dogs/${dogId}`} label={t('common.backToDog')} />

      <section className="vshare-hero">
        <span className="vshare-hero-emoji" aria-hidden="true">👥</span>
        <h1>{t('cotutor.manageTitle')}</h1>
        <p>{t('cotutor.manageIntro', { dog: name })}</p>
      </section>

      {ownerOnly ? (
        <div className="vshare-card vshare-empty">
          <p>{t('cotutor.ownerOnly')}</p>
        </div>
      ) : !isPremium ? (
        <div className="vshare-card vshare-empty">
          <p>{t('cotutor.premiumNeeded')}</p>
          <Link className="vshare-btn" to="/upgrade">{t('cotutor.goPremium')}</Link>
        </div>
      ) : (
        <>
          <form className="vshare-card" onSubmit={invite}>
            <label className="vshare-label" htmlFor="cotutor-email">{t('cotutor.emailLabel')}</label>
            <div className="vshare-linkrow">
              <input
                id="cotutor-email"
                className="vshare-input"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="vshare-copy" type="submit" disabled={busy || !email.trim()}>
                {busy ? '…' : t('cotutor.invite')}
              </button>
            </div>
            {notice && <p className="vshare-note" style={{ color: '#16a34a' }}>{notice}</p>}
            {error && <p className="vshare-note" style={{ color: '#ef4444' }}>{error}</p>}
            <p className="vshare-note">{t('cotutor.fullAccessNote')}</p>
          </form>

          {lastInvite && (
            <div className="vshare-card">
              <label className="vshare-label">{t('cotutor.linkLabel', { email: lastInvite.email })}</label>
              <div className="vshare-linkrow">
                <input className="vshare-input" value={lastInvite.url} readOnly onFocus={(e) => e.target.select()} />
                <button type="button" className="vshare-copy" onClick={copyLink}>
                  {copied ? t('cotutor.copied') : t('cotutor.copy')}
                </button>
              </div>
              <div className="vshare-actions">
                <a className="vshare-btn vshare-wa" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">
                  💬 {t('cotutor.sendWhatsapp')}
                </a>
              </div>
              <p className="vshare-note">{t('cotutor.linkNote')}</p>
            </div>
          )}

          {(data.cotutores.length > 0 || data.pending.length > 0) && (
            <div className="vshare-card">
              {data.cotutores.map((c) => (
                <div key={c.userId} className="vshare-linkrow" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{c.name || c.email} <small style={{ color: '#6b7280' }}>{c.email}</small></span>
                  <button className="vshare-btn vshare-revoke" onClick={() => removeCotutor(c.userId)} disabled={busy}>
                    {t('cotutor.remove')}
                  </button>
                </div>
              ))}
              {data.pending.map((p) => (
                <div key={p.email} className="vshare-linkrow" style={{ marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{p.email} <small style={{ color: '#d97706' }}>{t('cotutor.pending')}</small></span>
                  <button className="vshare-copy" onClick={() => resendPending(p.email)} disabled={busy}>
                    {t('cotutor.copyLink')}
                  </button>
                  <button className="vshare-btn vshare-revoke" onClick={() => cancelInvite(p.email)} disabled={busy}>
                    {t('cotutor.cancel')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
