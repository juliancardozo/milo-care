import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required.'); return; }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <h1>Check your email</h1>
        <p>If an account with that email exists, we've sent a password reset link. Check your inbox.</p>
        <Link to="/login">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Reset your password</h1>
      <p>Enter your email and we'll send you a reset link.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!error} />
          {error && <span className="field-error">{error}</span>}
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p><Link to="/login">Back to login</Link></p>
    </div>
  );
}
