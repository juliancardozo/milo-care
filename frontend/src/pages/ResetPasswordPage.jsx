import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const userId = searchParams.get('userId') || '';

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!token || !userId) { setError('Invalid or missing reset link. Request a new one.'); return; }
    setError('');
    setLoading(true);
    try {
      await resetPassword({ token, userId, newPassword });
      navigate('/login?reset=success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. The link may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Set new password</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} aria-invalid={!!error} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Set new password'}</button>
      </form>
      <p><Link to="/forgot-password">Request a new link</Link></p>
    </div>
  );
}
