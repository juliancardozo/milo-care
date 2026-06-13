import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import BackLink from '../components/BackLink';
import { getDog } from '../services/api';
import { getBehaviors, createBehavior, deleteBehavior } from '../services/behaviorApi';
import '../styles/album.css';

const KINDS = ['logro', 'travesura', 'momento'];

export default function AlbumPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const [dog, setDog] = useState(null);
  const [behaviors, setBehaviors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState('logro');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const load = () => {
    getBehaviors(dogId).then(({ data }) => setBehaviors(data.behaviors || [])).catch(() => setBehaviors([]));
  };

  useEffect(() => {
    getDog(dogId).then(({ data }) => setDog(data)).catch(() => setDog(null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogId]);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await createBehavior(dogId, { kind, title: title.trim(), note: note || undefined, photoUrl: photoUrl || undefined });
      setTitle(''); setNote(''); setPhotoUrl(''); setKind('logro'); setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await deleteBehavior(dogId, id).catch(() => {});
    load();
  };

  const dogName = dog?.name || '';

  return (
    <div className="album-page">
      <BackLink to="/dashboard" />
      <div className="album-head">
        <h1>{t('album.title', { dog: dogName })}</h1>
        <p>{t('album.subtitle')}</p>
      </div>

      <div className="album-add-bar">
        <button className="btn" onClick={() => setShowForm((v) => !v)}>{t('album.add')}</button>
      </div>

      {showForm && (
        <div className="album-form">
          <div className="album-kind-row">
            {KINDS.map((k) => (
              <button key={k} className={`album-kind-btn ${kind === k ? 'selected' : ''}`} onClick={() => setKind(k)}>
                {t(`album.kinds.${k}`)}
              </button>
            ))}
          </div>
          <input className="album-input" placeholder={t('quickActions.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="album-textarea" rows={2} placeholder={t('quickActions.notePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
          <input className="album-input" placeholder={t('quickActions.photoPlaceholder')} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
          <button className="btn" disabled={!title.trim() || saving} onClick={submit}>
            {saving ? t('quickActions.saving') : t('quickActions.save')}
          </button>
        </div>
      )}

      {behaviors.length === 0 ? (
        <p className="album-empty">{t('album.empty')}</p>
      ) : (
        <div className="album-feed">
          {behaviors.map((b) => (
            <div key={b._id} className="album-card">
              {b.photoUrl && <img className="album-card-photo" src={b.photoUrl} alt={b.title} />}
              <div className="album-card-body">
                <span className="album-card-kind">{t(`album.kinds.${b.kind}`)}</span>
                <h3 className="album-card-title">{b.title}</h3>
                {b.note && <p className="album-card-note">{b.note}</p>}
                <div className="album-card-date">{new Date(b.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <button className="album-card-delete" onClick={() => remove(b._id)}>{t('album.delete')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
