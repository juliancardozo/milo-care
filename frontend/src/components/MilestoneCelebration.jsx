import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { milestoneCopy } from '../config/milestoneTemplates';
import { renderCard, downloadCard, shareCard, FORMATS } from '../utils/milestoneCard';
import { markMilestoneSeen, markMilestoneShare } from '../services/milestoneApi';
import '../styles/milestone.css';

export default function MilestoneCelebration({ dog, milestone, referralCode, onClose }) {
  const { t, language } = useI18n();
  const [format, setFormat] = useState('square');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [busy, setBusy] = useState(false);

  const copy = milestoneCopy(milestone, language, dog.name);

  // Marca como visto una sola vez (no se vuelve a celebrar).
  useEffect(() => {
    markMilestoneSeen(dog.id, milestone.key).catch(() => {});
  }, [dog.id, milestone.key]);

  const build = useCallback(async () => {
    const c = await renderCard({
      photoUrl: dog.photoUrl,
      emoji: copy.emoji,
      title: copy.title,
      subtitle: copy.subtitle,
      referralCode,
      format,
    });
    setCanvas(c);
    setPreviewUrl(c.toDataURL('image/png'));
  }, [dog.photoUrl, copy.emoji, copy.title, copy.subtitle, referralCode, format]);

  useEffect(() => { build(); }, [build]);

  const filename = `milo-${milestone.key}.png`;

  const onDownload = async () => {
    if (!canvas || busy) return;
    setBusy(true);
    try {
      await downloadCard(canvas, filename);
      markMilestoneShare(dog.id, milestone.key, 'downloaded').catch(() => {});
    } finally { setBusy(false); }
  };

  const onShare = async () => {
    if (!canvas || busy) return;
    setBusy(true);
    try {
      const result = await shareCard(canvas, { title: 'Milo Care', text: copy.title, filename });
      markMilestoneShare(dog.id, milestone.key, result).catch(() => {});
    } finally { setBusy(false); }
  };

  return (
    <div className="milestone-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="milestone-modal">
        <p className="milestone-celebrate-title">{t('milestones.celebrate')}</p>
        <p className="milestone-celebrate-sub">{copy.title}</p>

        {previewUrl
          ? <img className="milestone-preview" src={previewUrl} alt={copy.title} />
          : <div className="milestone-preview" style={{ aspectRatio: format === 'story' ? '9/16' : '1/1', background: '#eef2ff' }} />}

        <div className="milestone-format-toggle">
          {Object.keys(FORMATS).map((f) => (
            <button key={f} className={`milestone-format-btn ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>
              {FORMATS[f].label}
            </button>
          ))}
        </div>

        <div className="milestone-actions">
          <button className="milestone-btn milestone-btn-download" disabled={busy} onClick={onDownload}>
            {t('milestones.download')}
          </button>
          <button className="milestone-btn milestone-btn-share" disabled={busy} onClick={onShare}>
            {t('milestones.share')}
          </button>
        </div>

        <button className="milestone-close-x" onClick={onClose}>{t('milestones.later')}</button>
      </div>
    </div>
  );
}
