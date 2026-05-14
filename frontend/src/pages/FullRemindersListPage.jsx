import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { useI18n } from '../i18n/I18nProvider';
import { fetchFullRemindersList } from '../services/reminderFullListService';
import ReminderWindowPreference from '../components/ReminderWindowPreference';
import ReminderItem from '../components/ReminderItem';

export default function FullRemindersListPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [meta, setMeta] = useState({ total: 0, windowDays: 7, windowSource: 'default' });
  const [reminders, setReminders] = useState([]);

  async function load(windowDays) {
    setLoading(true);
    setError('');
    setFallbackMessage('');
    try {
      const data = await fetchFullRemindersList(windowDays);
      setReminders(data.reminders || []);
      setMeta({
        total: data.total || 0,
        windowDays: data.windowDays || 7,
        windowSource: data.windowSource || 'default',
      });
      if (data.appliedFallback) {
        setFallbackMessage(data.appliedFallback);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('remindersFullList.errors.load'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const qp = searchParams.get('windowDays');
    load(qp ? Number(qp) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handlePreferenceSaved(newDays) {
    const next = new URLSearchParams(searchParams);
    next.set('windowDays', String(newDays));
    setSearchParams(next);
  }

  return (
    <div className="page">
      <BackLink />
      <div className="page-header">
        <h1>{t('remindersFullList.title')}</h1>
      </div>

      <ReminderWindowPreference initialValue={meta.windowDays} onSaved={handlePreferenceSaved} />

      <div className="card" style={{ marginTop: 12 }}>
        <p>
          {t('remindersFullList.total')}: <strong>{meta.total}</strong>
        </p>
        <p>
          {t('remindersFullList.windowInfo', {
            days: meta.windowDays,
            source: t(`remindersFullList.sources.${meta.windowSource}`),
          })}
        </p>
      </div>

      {fallbackMessage && <p className="warning-message">{fallbackMessage}</p>}
      {error && <p className="server-error">{error}</p>}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : reminders.length === 0 ? (
        <p className="list-empty">{t('remindersFullList.empty')}</p>
      ) : (
        <ul className="record-list" style={{ marginTop: 12 }}>
          {reminders.map((r) => (
            <ReminderItem key={r.id} reminder={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
