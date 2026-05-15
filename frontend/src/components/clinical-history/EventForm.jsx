import { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import {
  addSymptom,
  updateSymptom,
  addConsultation,
  updateConsultation,
} from '../../services/clinicalHistoryApi';

const SEVERITY_LEVELS = ['mild', 'moderate', 'severe'];
const SYMPTOM_TYPES = [
  'Vómitos',
  'Diarrea',
  'Tos',
  'Convulsiones',
  'Dificultad para respirar',
  'Pérdida de apetito',
  'Letargo',
  'Cojera',
  'Picazón',
  'Otro',
];

export default function EventForm({ dogId, eventType, editingEvent, onSave, onCancel }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingEvent) {
      setForm(editingEvent);
    } else {
      resetForm();
    }
  }, [eventType, editingEvent]);

  function resetForm() {
    if (eventType === 'symptom') {
      setForm({
        symptomType: '',
        description: '',
        severity: 'mild',
        dateObserved: new Date().toISOString().split('T')[0],
        notes: '',
        resolved: false,
      });
    } else if (eventType === 'consultation') {
      setForm({
        vetName: '',
        clinicName: '',
        reason: '',
        dateOfConsult: new Date().toISOString().split('T')[0],
        findings: '',
        recommendations: '',
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (eventType === 'symptom') {
        if (editingEvent?._id) {
          await updateSymptom(dogId, editingEvent._id, form);
        } else {
          await addSymptom(dogId, form);
        }
      } else if (eventType === 'consultation') {
        if (editingEvent?._id) {
          await updateConsultation(dogId, editingEvent._id, form);
        } else {
          await addConsultation(dogId, form);
        }
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving record');
    } finally {
      setLoading(false);
    }
  }

  const renderForm = () => {
    if (eventType === 'symptom') {
      return (
        <>
          <div className="form-group">
            <label>{t('clinical.symptomType') || 'Symptom Type'}</label>
            <select
              value={form.symptomType || ''}
              onChange={(e) => setForm({ ...form, symptomType: e.target.value })}
              required
            >
              <option value="">Select symptom...</option>
              {SYMPTOM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('clinical.description') || 'Description'}</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the symptom..."
              maxLength={2000}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{t('clinical.severity') || 'Severity'}</label>
              <select
                value={form.severity || 'mild'}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('clinical.dateObserved') || 'Date Observed'}</label>
              <input
                type="date"
                value={form.dateObserved || ''}
                onChange={(e) => setForm({ ...form, dateObserved: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('clinical.notes') || 'Notes'}</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.resolved || false}
                onChange={(e) => setForm({ ...form, resolved: e.target.checked })}
              />
              {t('clinical.resolved') || 'Mark as Resolved'}
            </label>
          </div>
        </>
      );
    } else if (eventType === 'consultation') {
      return (
        <>
          <div className="form-row">
            <div className="form-group">
              <label>{t('clinical.vetName') || 'Veterinarian Name'}</label>
              <input
                type="text"
                value={form.vetName || ''}
                onChange={(e) => setForm({ ...form, vetName: e.target.value })}
                placeholder="Dr. Name"
              />
            </div>

            <div className="form-group">
              <label>{t('clinical.clinicName') || 'Clinic Name'}</label>
              <input
                type="text"
                value={form.clinicName || ''}
                onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                placeholder="Clinic name"
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t('clinical.reason') || 'Reason for Visit'}</label>
            <input
              type="text"
              value={form.reason || ''}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Annual checkup, Vaccination follow-up"
              required
            />
          </div>

          <div className="form-group">
            <label>{t('clinical.dateOfConsult') || 'Date'}</label>
            <input
              type="date"
              value={form.dateOfConsult || ''}
              onChange={(e) => setForm({ ...form, dateOfConsult: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('clinical.findings') || 'Findings'}</label>
            <textarea
              value={form.findings || ''}
              onChange={(e) => setForm({ ...form, findings: e.target.value })}
              placeholder="What did the vet find?"
            />
          </div>

          <div className="form-group">
            <label>{t('clinical.recommendations') || 'Recommendations'}</label>
            <textarea
              value={form.recommendations || ''}
              onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
              placeholder="Vet recommendations..."
            />
          </div>
        </>
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <h3>{editingEvent ? t('clinical.editEvent') || 'Edit Event' : t('clinical.addEvent') || 'Add Event'}</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      {renderForm()}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('common.saving') || 'Saving...' : t('common.save') || 'Save'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
          {t('common.cancel') || 'Cancel'}
        </button>
      </div>
    </form>
  );
}
