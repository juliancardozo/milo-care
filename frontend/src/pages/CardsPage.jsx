import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import BackLink from '../components/BackLink';
import { getDog } from '../services/api';
import { loveTemplates, loveCopy } from '../config/milestoneTemplates';
import { renderCard, downloadCard, shareCard, FORMATS } from '../utils/milestoneCard';
import '../styles/milestone.css';

export default function CardsPage() {
  const { t, language } = useI18n();
  const { dogId } = useParams();
  const [dog, setDog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [format, setFormat] = useState('square');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [busy, setBusy] = useState(false);

  const templates = loveTemplates(language);

  useEffect(() => {
    getDog(dogId).then(({ data }) => setDog(data)).catch(() => setDog(null));
  }, [dogId]);

  const build = useCallback(async () => {
    if (!selected || !dog) return;
    const copy = loveCopy(selected, dog.name);
    const c = await renderCard({ photoUrl: dog.photoUrl, emoji: copy.emoji, title: copy.title, subtitle: copy.subtitle, format });
    setCanvas(c);
    setPreviewUrl(c.toDataURL('image/png'));
  }, [selected, dog, format]);

  useEffect(() => { build(); }, [build]);

  const filename = `milo-${selected?.id || 'card'}.png`;

  return (
    <div className="cards-page">
      <BackLink to="/dashboard" />
      <div className="cards-head">
        <h1>{t('milestones.cardsTitle')}</h1>
        <p className="list-empty" style={{ margin: 0 }}>{t('milestones.cardsSubtitle')}</p>
      </div>

      <div className="cards-templates">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            className={`cards-template-btn ${selected?.id === tpl.id ? 'selected' : ''}`}
            onClick={() => setSelected(tpl)}
          >
            {tpl.emoji} {loveCopy(tpl, dog?.name || '').title}
          </button>
        ))}
      </div>

      {selected && (
        <div className="cards-preview-wrap">
          {previewUrl
            ? <img className="milestone-preview" src={previewUrl} alt={selected.id} />
            : <div className="milestone-preview" style={{ aspectRatio: format === 'story' ? '9/16' : '1/1', background: '#eef2ff' }} />}

          <div className="milestone-format-toggle">
            {Object.keys(FORMATS).map((f) => (
              <button key={f} className={`milestone-format-btn ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
                {FORMATS[f].label}
              </button>
            ))}
          </div>

          <div className="milestone-actions">
            <button className="milestone-btn milestone-btn-download" disabled={busy || !canvas} onClick={async () => { setBusy(true); try { await downloadCard(canvas, filename); } finally { setBusy(false); } }}>
              {t('milestones.download')}
            </button>
            <button className="milestone-btn milestone-btn-share" disabled={busy || !canvas} onClick={async () => { setBusy(true); try { await shareCard(canvas, { title: 'Milo Care', text: loveCopy(selected, dog?.name || '').title, filename }); } finally { setBusy(false); } }}>
              {t('milestones.share')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
