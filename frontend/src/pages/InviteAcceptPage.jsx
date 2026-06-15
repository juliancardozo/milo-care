import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectIsAuthenticated } from '../store/authSlice';
import { peekInvite, acceptInvite } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/vet-share.css';

export default function InviteAcceptPage() {
  const { token } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);

  const [preview, setPreview] = useState(null); // { dogName, inviterName, inviteeEmail, isNewUser }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    peekInvite(token)
      .then(({ data }) => setPreview(data))
      .catch(() => setError(t('cotutor.invalidInvite')))
      .finally(() => setLoading(false));
  }, [token, t]);

  async function accept() {
    setBusy(true);
    setError('');
    try {
      await acceptInvite(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || t('cotutor.acceptFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="vshare-page"><p>{t('common.loading')}</p></div>;

  if (error && !preview) {
    return (
      <div className="vshare-page">
        <section className="vshare-hero">
          <span className="vshare-hero-emoji" aria-hidden="true">🐾</span>
          <h1>{t('cotutor.invalidTitle')}</h1>
          <p>{error}</p>
        </section>
        <div className="vshare-card vshare-empty">
          <Link className="vshare-btn" to="/dashboard">{t('common.dashboard')}</Link>
        </div>
      </div>
    );
  }

  const dogName = preview?.dogName || 'tu perro';
  const inviterName = preview?.inviterName || '';
  const emailMatches = isAuthenticated && user?.email === preview?.inviteeEmail;

  return (
    <div className="vshare-page">
      <section className="vshare-hero">
        <span className="vshare-hero-emoji" aria-hidden="true">🐾</span>
        <h1>{t('cotutor.inviteTitle', { dog: dogName })}</h1>
        <p>{t('cotutor.inviteIntro', { inviter: inviterName, dog: dogName })}</p>
      </section>

      <div className="vshare-card">
        {isAuthenticated ? (
          emailMatches ? (
            <>
              <p>{t('cotutor.acceptAs', { email: user.email })}</p>
              <button className="vshare-btn" onClick={accept} disabled={busy}>
                {busy ? '…' : t('cotutor.acceptCta', { dog: dogName })}
              </button>
            </>
          ) : (
            <>
              <p className="vshare-note">{t('cotutor.wrongAccount', { email: preview?.inviteeEmail })}</p>
              <Link className="vshare-btn" to={`/login?next=/invite/${token}`}>{t('auth.login')}</Link>
            </>
          )
        ) : preview?.isNewUser ? (
          <>
            <p>{t('cotutor.needAccount', { dog: dogName })}</p>
            <Link
              className="vshare-btn"
              to={`/register?invite=${token}&email=${encodeURIComponent(preview?.inviteeEmail || '')}`}
            >
              {t('cotutor.createAccountCta')}
            </Link>
          </>
        ) : (
          <>
            <p>{t('cotutor.loginToAccept', { dog: dogName })}</p>
            <Link className="vshare-btn" to={`/login?next=/invite/${token}`}>{t('auth.login')}</Link>
          </>
        )}

        {error && <p className="vshare-note" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    </div>
  );
}
