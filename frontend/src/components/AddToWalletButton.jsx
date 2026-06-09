import { useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { generateWalletPass } from '../services/walletApi';

// Botón "Agregar a Google Wallet" para un perro. Pide al backend un pase (snapshot) y
// abre la URL oficial "Save to Google Wallet". Mismo patrón de estados que UpgradePage.
export default function AddToWalletButton({ dogId, className = '' }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await generateWalletPass(dogId);
      window.open(data.saveUrl, '_blank', 'noopener');
    } catch {
      setError(t('wallet.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`wallet-button ${className}`}>
      <button
        type="button"
        className="btn"
        onClick={handleClick}
        disabled={loading}
      >
        <span aria-hidden="true">🪪</span>{' '}
        {loading ? t('wallet.adding') : t('wallet.addButton')}
      </button>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
