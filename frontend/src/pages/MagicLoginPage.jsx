import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { magicLogin } from '../services/api';
import { useI18n } from '../i18n/I18nProvider';

// Consume el token del magic link e inicia sesión automáticamente.
export default function MagicLoginPage() {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const ran = useRef(false); // evita doble canje en StrictMode

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const next = searchParams.get('next');
    if (!token || !userId) { setError(t('auth.errors.invalidMagicLink')); return; }

    magicLogin({ token, userId })
      .then(({ data }) => {
        dispatch(setCredentials({ user: data.user, token: data.token }));
        navigate(next && next.startsWith('/') ? next : '/dashboard', { replace: true });
      })
      .catch((err) => setError(err.response?.data?.message || t('auth.errors.invalidMagicLink')));
  }, [searchParams, dispatch, navigate, t]);

  return (
    <div className="auth-page">
      {error ? (
        <>
          <h1>{t('auth.magicFailedTitle')}</h1>
          <p>{error}</p>
          <p><Link to="/magic-link">{t('auth.requestNewMagicLink')}</Link></p>
          <p><Link to="/login">{t('auth.backToLogin')}</Link></p>
        </>
      ) : (
        <>
          <h1>{t('auth.magicLoggingIn')}</h1>
          <p>{t('common.loading')}</p>
        </>
      )}
    </div>
  );
}
