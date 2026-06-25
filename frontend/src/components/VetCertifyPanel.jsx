import { useEffect, useState } from 'react';
import { getVetPatients, attestVetItem } from '../services/clinicApi';
import { useI18n } from '../i18n/I18nProvider';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Sección del panel del vet para CERTIFICAR carnets: lista los pacientes de su
 * clínica con sus vacunas/desparasitaciones y permite atestar cada ítem. La firma
 * agrega el sello "Certificado por tu clínica" en el Health Score del perro.
 */
export default function VetCertifyPanel() {
  const { t } = useI18n();
  const [patients, setPatients] = useState(null);
  const [busy, setBusy] = useState(null); // `${dogId}:${itemId}`
  const [error, setError] = useState('');

  useEffect(() => {
    getVetPatients()
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => setPatients([]));
  }, []);

  async function certify(dogId, item) {
    const key = `${dogId}:${item.itemId}`;
    setBusy(key);
    setError('');
    try {
      const { data } = await attestVetItem(dogId, { kind: item.kind, itemId: item.itemId });
      setPatients((prev) => prev.map((p) => {
        if (p.dogId !== dogId) return p;
        const mark = (arr) => arr.map((it) => (it.itemId === item.itemId ? { ...it, vetValidatedAt: data.vetValidatedAt } : it));
        return { ...p, vaccinations: mark(p.vaccinations), deworming: mark(p.deworming) };
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setBusy(null);
    }
  }

  // No renderiza nada hasta cargar; oculta la sección si no hay pacientes.
  if (!patients || patients.length === 0) return null;

  return (
    <section className="vp-section card vp-certify">
      <h2 className="vp-section-title">{t('vetPanel.certifyTitle')}</h2>
      <p className="vp-certify-sub">{t('vetPanel.certifySub')}</p>
      {error && <p className="server-error">{error}</p>}

      <ul className="vp-certify-list">
        {patients.map((p) => {
          const items = [...p.vaccinations, ...p.deworming];
          return (
            <li key={p.dogId} className="vp-certify-dog">
              <div className="vp-certify-dog-head">
                <strong>{p.dogName}</strong> <span className="vp-due-meta">{p.ownerFirstName}</span>
              </div>
              <ul className="vp-certify-items">
                {items.map((it) => {
                  const key = `${p.dogId}:${it.itemId}`;
                  return (
                    <li key={key} className="vp-certify-item">
                      <span className="vp-certify-name">
                        {it.kind === 'vaccination' ? '💉' : '🪱'} {it.name}{' '}
                        <span className="vp-due-meta">{fmt(it.dateAdministered)}</span>
                      </span>
                      {it.vetValidatedAt ? (
                        <span className="vp-certify-done">✓ {t('vetPanel.certified')}</span>
                      ) : (
                        <button
                          type="button"
                          className="vp-certify-btn"
                          disabled={busy === key}
                          onClick={() => certify(p.dogId, it)}
                        >
                          {busy === key ? '…' : t('vetPanel.certify')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
