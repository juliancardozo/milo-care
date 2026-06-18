import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { getCheckinToday, getCheckinStreak, postCheckin } from '../../services/checkinApi';
import { rollSurprise } from '../../services/referralApi';
import CheckinTrends from './CheckinTrends';
import SurpriseModal from '../SurpriseModal';
import '../../styles/checkin.css';
import '../../styles/referrals.css';

const ANSWERS = ['bien', 'regular', 'mal'];

function questionText(t, dogName, question, focus) {
  if (focus) {
    const f = t(`checkin.focus.${focus}`, { dog: dogName });
    // Si no hay traducción para ese focus, caemos a la pregunta base.
    if (f && !f.startsWith('checkin.focus.')) return f;
  }
  return t(`checkin.questions.${question}`, { dog: dogName });
}

function StreakChip({ streak, dogName, t }) {
  if (!streak || streak < 1) return <span />;
  const key = streak === 1 ? 'checkin.streakOne' : 'checkin.streak';
  return <span className="checkin-streak">{t(key, { n: streak, dog: dogName })}</span>;
}

export default function CheckinCard({ dog }) {
  const { t } = useI18n();
  const [today, setToday] = useState(null);
  const [streak, setStreak] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const [error, setError] = useState('');
  const [showTrends, setShowTrends] = useState(false);
  const [surprise, setSurprise] = useState(null);

  const load = () => {
    getCheckinToday(dog.id).then(({ data }) => setToday(data)).catch(() => setToday(null));
    getCheckinStreak(dog.id).then(({ data }) => setStreak(data.streak)).catch(() => setStreak(0));
  };

  useEffect(() => {
    setToday(null);
    setJustAnswered(false);
    setNote('');
    setError('');
    setShowTrends(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dog.id]);

  const handleAnswer = async (answer) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await postCheckin(dog.id, { answer, note: note.trim() || undefined });
      setJustAnswered(true);
      setTimeout(() => { load(); }, 1300);
      // Sorpresa: se pide DESPUÉS de la confirmación, nunca interrumpe el flujo.
      rollSurprise(dog.id)
        .then(({ data }) => { if (data.surprise) setTimeout(() => setSurprise(data.surprise), 1500); })
        .catch(() => {});
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'CHECKIN_ALREADY_EXISTS') {
        load();
      } else {
        setError(t('checkin.error'));
      }
    } finally {
      setSaving(false);
    }
  };

  if (!today) return null;

  const answered = today.answered;

  // Estado respondido (y sin animación de recién-respondido) → strip slim: una
  // sola línea con la confirmación, la racha y "ver seguimiento". No es un hero.
  if (answered && !justAnswered) {
    return (
      <section className="checkin-card checkin-slim">
        <div className="checkin-slim-row">
          <span className="checkin-slim-icon" aria-hidden="true">✅</span>
          <p className="checkin-slim-msg">{t('checkin.answeredToday', { dog: dog.name })}</p>
          <StreakChip streak={streak} dogName={dog.name} t={t} />
          <button
            type="button"
            className="checkin-trends-toggle"
            onClick={() => setShowTrends((v) => !v)}
          >
            {showTrends ? t('checkin.hideTrends') : t('checkin.viewTrends')}
          </button>
        </div>
        {showTrends && <CheckinTrends dog={dog} />}
        {surprise && <SurpriseModal surprise={surprise} onClose={() => setSurprise(null)} />}
      </section>
    );
  }

  return (
    <section className="checkin-card">
      <p className="checkin-eyebrow">{t('checkin.eyebrow')}</p>

      {justAnswered ? (
        <div className="checkin-thanks">{t('checkin.thanks', { dog: dog.name })}</div>
      ) : (
        <>
          <p className="checkin-question">
            {questionText(t, dog.name, today.question, today.focus)}
          </p>
          <div className="checkin-answers">
            {ANSWERS.map((a) => (
              <button
                key={a}
                type="button"
                className={`checkin-answer-btn checkin-answer-${a}`}
                disabled={saving}
                onClick={() => handleAnswer(a)}
              >
                {t(`checkin.answers.${a}`)}
              </button>
            ))}
          </div>
          <textarea
            className="checkin-note"
            rows={2}
            placeholder={t('checkin.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
          />
          {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
        </>
      )}

      <div className="checkin-foot">
        <StreakChip streak={streak} dogName={dog.name} t={t} />
        <button
          type="button"
          className="checkin-trends-toggle"
          onClick={() => setShowTrends((v) => !v)}
        >
          {showTrends ? t('checkin.hideTrends') : t('checkin.viewTrends')}
        </button>
      </div>

      {showTrends && <CheckinTrends dog={dog} />}

      {surprise && <SurpriseModal surprise={surprise} onClose={() => setSurprise(null)} />}
    </section>
  );
}
