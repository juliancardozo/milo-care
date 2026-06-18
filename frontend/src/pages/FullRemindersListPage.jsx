import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackLink from '../components/BackLink';
import { useI18n } from '../i18n/I18nProvider';
import { fetchFullRemindersList } from '../services/reminderFullListService';
import { dismissReminder, restoreReminder } from '../services/api';
import ReminderWindowPreference from '../components/ReminderWindowPreference';
import ReminderItem from '../components/ReminderItem';
import { bucketOf, BUCKET_ORDER, typeMeta } from '../utils/reminderDisplay';
import '../styles/reminders-full.css';

const TYPE_FILTERS = ['vaccination', 'deworming', 'medication', 'appointment'];

function SkeletonList() {
  return (
    <div className="rfl-skeletons" aria-busy="true" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rfl-skel-item">
          <span className="rfl-skel-icon" />
          <span className="rfl-skel-lines"><span /><span /></span>
          <span className="rfl-skel-due" />
        </div>
      ))}
    </div>
  );
}

export default function FullRemindersListPage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [meta, setMeta] = useState({ total: 0, windowDays: 7, windowSource: 'default' });
  const [reminders, setReminders] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [dogFilter, setDogFilter] = useState('all');
  const [undo, setUndo] = useState(null); // { reminder } recién descartado, para deshacer

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
      if (data.appliedFallback) setFallbackMessage(data.appliedFallback);
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

  useEffect(() => {
    if (!undo) return undefined;
    const id = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(id);
  }, [undo]);

  function handlePreferenceSaved(newDays) {
    const next = new URLSearchParams(searchParams);
    next.set('windowDays', String(newDays));
    setSearchParams(next);
  }

  // Descarte optimista: saca el recordatorio de la lista y ofrece deshacer.
  async function handleDismiss(reminder) {
    setReminders((prev) => prev.filter((r) => r.dedupeKey !== reminder.dedupeKey));
    setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }));
    setUndo({ reminder });
    try {
      await dismissReminder(reminder.dedupeKey);
    } catch {
      // Revertir si falla el guardado
      setReminders((prev) => [...prev, reminder]);
      setMeta((m) => ({ ...m, total: m.total + 1 }));
      setUndo(null);
    }
  }

  async function handleUndo() {
    if (!undo) return;
    const { reminder } = undo;
    setUndo(null);
    try {
      await restoreReminder(reminder.dedupeKey);
      setReminders((prev) => [...prev, reminder]);
      setMeta((m) => ({ ...m, total: m.total + 1 }));
    } catch {
      /* si falla, queda descartado */
    }
  }

  const now = new Date();

  // Stats over the full (unfiltered) set.
  const overdueCount = useMemo(
    () => reminders.filter((r) => r.status === 'overdue').length,
    [reminders]
  );
  const upcomingCount = reminders.length - overdueCount;

  // Which type chips to show + which dogs are present.
  const typesPresent = useMemo(
    () => TYPE_FILTERS.filter((tp) => reminders.some((r) => r.sourceType === tp)),
    [reminders]
  );
  const dogsPresent = useMemo(() => {
    const seen = new Map();
    reminders.forEach((r) => { if (!seen.has(r.petId)) seen.set(r.petId, r.petName); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [reminders]);

  const filtered = useMemo(
    () => reminders.filter(
      (r) => (typeFilter === 'all' || r.sourceType === typeFilter)
        && (dogFilter === 'all' || r.petId === dogFilter)
    ),
    [reminders, typeFilter, dogFilter]
  );

  // Group the filtered set into ordered time buckets.
  const groups = useMemo(() => {
    const map = { overdue: [], today: [], soon: [], later: [] };
    filtered.forEach((r) => map[bucketOf(r, now)].push(r));
    return BUCKET_ORDER.map((key) => ({ key, items: map[key] })).filter((g) => g.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  const hasFilters = typeFilter !== 'all' || dogFilter !== 'all';

  return (
    <div className="page rfl-page">
      <BackLink to="/dashboard" />

      <div className="rfl-header">
        <h1>{t('remindersFullList.title')}</h1>
        <p className="rfl-subtitle">{t('remindersFullList.subtitle')}</p>
      </div>

      {/* Summary stats */}
      <div className="rfl-stats">
        <div className={`rfl-stat ${overdueCount ? 'rfl-stat-overdue' : ''}`}>
          <span className="rfl-stat-num">{overdueCount}</span>
          <span className="rfl-stat-label">{t('remindersFullList.stats.overdue')}</span>
        </div>
        <div className="rfl-stat rfl-stat-upcoming">
          <span className="rfl-stat-num">{upcomingCount}</span>
          <span className="rfl-stat-label">{t('remindersFullList.stats.upcoming')}</span>
        </div>
        <div className="rfl-stat">
          <span className="rfl-stat-num">{meta.total}</span>
          <span className="rfl-stat-label">{t('remindersFullList.stats.total')}</span>
        </div>
      </div>

      {/* Controls: window + filters */}
      <div className="rfl-controls card">
        <ReminderWindowPreference initialValue={meta.windowDays} onSaved={handlePreferenceSaved} />

        {(typesPresent.length > 1 || dogsPresent.length > 1) && (
          <div className="rfl-filters">
            {typesPresent.length > 1 && (
              <div className="rfl-filter-row">
                <span className="rfl-filter-caption">{t('remindersFullList.filters.byType')}</span>
                <div className="rfl-chips">
                  <button
                    className={`rfl-fchip ${typeFilter === 'all' ? 'rfl-fchip-on' : ''}`}
                    onClick={() => setTypeFilter('all')}
                  >
                    {t('remindersFullList.filters.allTypes')}
                  </button>
                  {typesPresent.map((tp) => (
                    <button
                      key={tp}
                      className={`rfl-fchip ${typeFilter === tp ? 'rfl-fchip-on' : ''}`}
                      onClick={() => setTypeFilter(tp)}
                    >
                      <span aria-hidden="true">{typeMeta(tp).icon}</span> {t(`remindersFullList.types.${tp}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dogsPresent.length > 1 && (
              <div className="rfl-filter-row">
                <span className="rfl-filter-caption">{t('remindersFullList.filters.byDog')}</span>
                <div className="rfl-chips">
                  <button
                    className={`rfl-fchip ${dogFilter === 'all' ? 'rfl-fchip-on' : ''}`}
                    onClick={() => setDogFilter('all')}
                  >
                    {t('remindersFullList.filters.allDogs')}
                  </button>
                  {dogsPresent.map((d) => (
                    <button
                      key={d.id}
                      className={`rfl-fchip ${dogFilter === d.id ? 'rfl-fchip-on' : ''}`}
                      onClick={() => setDogFilter(d.id)}
                    >
                      🐾 {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="rfl-window-info">
          {t('remindersFullList.windowInfo', {
            days: meta.windowDays,
            source: t(`remindersFullList.sources.${meta.windowSource}`),
          })}
        </p>
      </div>

      {fallbackMessage && <p className="warning-message">{fallbackMessage}</p>}
      {error && <p className="server-error">{error}</p>}

      {loading ? (
        <SkeletonList />
      ) : reminders.length === 0 ? (
        <div className="rfl-empty">
          <span className="rfl-empty-icon" aria-hidden="true">✅</span>
          <p className="rfl-empty-title">{t('remindersFullList.empty')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rfl-empty">
          <span className="rfl-empty-icon" aria-hidden="true">🔍</span>
          <p className="rfl-empty-title">{t('remindersFullList.emptyFiltered')}</p>
          {hasFilters && (
            <button
              className="rfl-clear-filters"
              onClick={() => { setTypeFilter('all'); setDogFilter('all'); }}
            >
              {t('remindersFullList.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div className="rfl-groups">
          {groups.map((g) => (
            <section key={g.key} className="rfl-group">
              <header className="rfl-group-head">
                <h2 className={`rfl-group-title ${g.key === 'overdue' ? 'rfl-group-title-overdue' : ''}`}>
                  {t(`remindersFullList.groups.${g.key}`)}
                </h2>
                <span className="rfl-group-count">{g.items.length}</span>
              </header>
              <ul className="rfl-list">
                {g.items.map((r) => (
                  <ReminderItem key={r.id} reminder={r} now={now} onDismiss={handleDismiss} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {undo && (
        <div className="rfl-undo" role="status">
          <span>{t('remindersFullList.dismissed')}</span>
          <button type="button" className="rfl-undo-btn" onClick={handleUndo}>
            {t('remindersFullList.undo')}
          </button>
        </div>
      )}
    </div>
  );
}
