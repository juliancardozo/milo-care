import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { createQuickSymptom } from '../services/api';
import { createBehavior } from '../services/behaviorApi';
import '../styles/quick-actions.css';

const SYMPTOM_TYPES = ['vomito', 'diarrea', 'tos', 'cojera', 'decaimiento', 'inapetencia', 'otro'];

// view: 'menu' | 'symptom' | 'logro' | 'travesura' | 'done' | 'alert'
// Modo controlado opcional: la barra inferior móvil abre la misma hoja con su
// botón "+" central (open/onOpenChange). Si no se pasan, gestiona su propio FAB.
export default function QuickActionsFab({ dog, onLogged, open: openProp, onOpenChange }) {
  const { t } = useI18n();
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v) => { if (onOpenChange) onOpenChange(v); if (!controlled) setOpenState(v); };
  const [view, setView] = useState('menu');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState(null);

  // form state
  const [symptomType, setSymptomType] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const reset = () => {
    setView('menu'); setSaving(false); setError(''); setAlert(null);
    setSymptomType(''); setTitle(''); setNote(''); setPhotoUrl('');
  };

  const close = () => { setOpen(false); setTimeout(reset, 200); };

  const finishOk = (alertInfo) => {
    if (onLogged) onLogged();
    if (alertInfo?.triggered) {
      setAlert(alertInfo);
      setView('alert');
    } else {
      setView('done');
      setTimeout(close, 1200);
    }
  };

  const submitSymptom = async () => {
    if (!symptomType || saving) return;
    setSaving(true); setError('');
    try {
      const { data } = await createQuickSymptom(dog.id, { quickType: symptomType, note: note || undefined, photoUrl: photoUrl || undefined });
      finishOk(data.alert);
    } catch {
      setError(t('quickActions.error'));
    } finally {
      setSaving(false);
    }
  };

  const submitBehavior = async (kind) => {
    if (!title.trim() || saving) return;
    setSaving(true); setError('');
    try {
      await createBehavior(dog.id, { kind, title: title.trim(), note: note || undefined, photoUrl: photoUrl || undefined });
      finishOk(null);
    } catch {
      setError(t('quickActions.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        className={`qa-fab ${open ? 'open' : ''}`}
        aria-label={t('quickActions.fab')}
        onClick={() => (open ? close() : setOpen(true))}
      >
        +
      </button>

      {open && (
        <div className="qa-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="qa-sheet">
            {view === 'menu' && (
              <>
                <h3>{t('quickActions.fab')}</h3>
                <div className="qa-menu">
                  <button className="qa-menu-btn" onClick={() => setView('symptom')}>{t('quickActions.quickSymptom')}</button>
                  <button className="qa-menu-btn" onClick={() => setView('logro')}>{t('quickActions.achievement')}</button>
                  <button className="qa-menu-btn" onClick={() => setView('travesura')}>{t('quickActions.mischief')}</button>
                </div>
              </>
            )}

            {view === 'symptom' && (
              <>
                <h3>{t('quickActions.symptomTypeLabel', { dog: dog.name })}</h3>
                <div className="qa-types">
                  {SYMPTOM_TYPES.map((typ) => (
                    <button
                      key={typ}
                      className={`qa-type-btn ${symptomType === typ ? 'selected' : ''}`}
                      onClick={() => setSymptomType(typ)}
                    >
                      {t(`quickActions.types.${typ}`)}
                    </button>
                  ))}
                </div>
                <textarea className="qa-textarea" rows={2} placeholder={t('quickActions.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
                <input className="qa-input" placeholder={t('quickActions.photoPlaceholder')} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                {error && <p className="qa-error">{error}</p>}
                <div className="qa-actions">
                  <button className="qa-btn-ghost" onClick={() => setView('menu')}>{t('quickActions.close')}</button>
                  <button className="qa-btn-primary" disabled={!symptomType || saving} onClick={submitSymptom}>
                    {saving ? t('quickActions.saving') : t('quickActions.save')}
                  </button>
                </div>
              </>
            )}

            {(view === 'logro' || view === 'travesura') && (
              <>
                <h3>{view === 'logro' ? t('quickActions.achievement') : t('quickActions.mischief')}</h3>
                <input className="qa-input" placeholder={t('quickActions.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className="qa-textarea" rows={2} placeholder={t('quickActions.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
                <input className="qa-input" placeholder={t('quickActions.photoPlaceholder')} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
                {error && <p className="qa-error">{error}</p>}
                <div className="qa-actions">
                  <button className="qa-btn-ghost" onClick={() => setView('menu')}>{t('quickActions.close')}</button>
                  <button className="qa-btn-primary" disabled={!title.trim() || saving} onClick={() => submitBehavior(view)}>
                    {saving ? t('quickActions.saving') : t('quickActions.save')}
                  </button>
                </div>
              </>
            )}

            {view === 'done' && <div className="qa-done">{t('quickActions.saved')}</div>}

            {view === 'alert' && alert && (
              <div className="qa-alert">
                <h4>{t('quickActions.alertTitle')}</h4>
                <p>
                  {alert.isPuppy
                    ? t('quickActions.alertBodyPuppy', { dog: dog.name })
                    : t('quickActions.alertBody', { dog: dog.name, n: alert.count })}
                </p>
                <Link to={`/dogs/${dog.id}/appointments`} onClick={close}>{t('quickActions.alertCta')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
