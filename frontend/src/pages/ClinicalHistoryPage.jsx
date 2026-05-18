import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useI18n } from '../i18n/I18nProvider';
import BackLink from '../components/BackLink';
import {
  setLoading,
  setError,
  setSymptoms,
  setConsultations,
  setVaccinations,
  setMedications,
  setAppointments,
  setSelectedEventType,
  selectAllEvents,
  selectSelectedEventType,
  selectLoading,
  selectError,
  deleteSymptomLocal,
  deleteConsultationLocal,
} from '../store/clinicalHistorySlice';
import {
  getSymptoms,
  getConsultations,
  getVaccinations,
  getMedications,
  getAppointments,
  deleteSymptom,
  deleteConsultation,
} from '../services/clinicalHistoryApi';
import EventForm from '../components/clinical-history/EventForm';
import EventTimeline from '../components/clinical-history/EventTimeline';
import '../styles/clinical-history.css';

export default function ClinicalHistoryPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const dispatch = useDispatch();

  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const allEvents = useSelector(selectAllEvents);
  const selectedType = useSelector(selectSelectedEventType);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('symptom'); // symptom, consultation, medication, appointment
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadClinicalHistory();
  }, [dogId]);

  async function loadClinicalHistory() {
    if (!dogId) return;
    dispatch(setLoading(true));
    try {
      const [symptomsRes, consultRes, vaccRes, medRes, appointRes] = await Promise.all([
        getSymptoms(dogId),
        getConsultations(dogId),
        getVaccinations(dogId),
        getMedications(dogId),
        getAppointments(dogId),
      ]);

      dispatch(setSymptoms(symptomsRes.data || []));
      dispatch(setConsultations(consultRes.data || []));
      dispatch(setVaccinations(vaccRes.data || []));
      dispatch(setMedications(medRes.data || []));
      dispatch(setAppointments(appointRes.data || []));
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error loading clinical history'));
    } finally {
      dispatch(setLoading(false));
    }
  }

  async function handleDeleteEvent(eventId, eventType) {
    if (!window.confirm(t('clinical.confirmDelete') || 'Delete this record?')) return;

    try {
      if (eventType === 'symptom') {
        await deleteSymptom(dogId, eventId);
        dispatch(deleteSymptomLocal(eventId));
      } else if (eventType === 'consultation') {
        await deleteConsultation(dogId, eventId);
        dispatch(deleteConsultationLocal(eventId));
      }
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error deleting record'));
    }
  }

  const eventTypes = [
    { value: 'all', label: t('clinical.filterAll') || 'All Events' },
    { value: 'symptom', label: t('clinical.symptoms') || 'Symptoms' },
    { value: 'consultation', label: t('clinical.consultations') || 'Consultations' },
    { value: 'vaccination', label: t('clinical.vaccinations') || 'Vaccinations' },
    { value: 'medication', label: t('clinical.medications') || 'Medications' },
    { value: 'appointment', label: t('clinical.appointments') || 'Appointments' },
  ];

  return (
    <div className="clinical-history-page">
      <BackLink to={`/dogs/${dogId}`} label={t('common.backToDog') || 'Back to Dog'} />

      <header className="page-header">
        <h1>{t('clinical.title') || 'Clinical History'}</h1>
        <div className="page-header-actions">
          <Link to={`/dogs/${dogId}/pdf-export`} className="btn btn-secondary">
            {t('pdf.download') || 'Download PDF'}
          </Link>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormType('symptom');
              setEditingEvent(null);
              setShowForm(true);
            }}
          >
            {t('clinical.addEvent') || '+ Add Event'}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filter Tabs */}
      <div className="event-filter">
        {eventTypes.map((type) => (
          <button
            key={type.value}
            className={`filter-btn ${selectedType === type.value ? 'active' : ''}`}
            onClick={() => dispatch(setSelectedEventType(type.value))}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading">{t('common.loading') || 'Loading...'}</div>
      ) : showForm ? (
        <div className="form-container">
          <EventForm
            dogId={dogId}
            eventType={formType}
            editingEvent={editingEvent}
            onSave={() => {
              setShowForm(false);
              loadClinicalHistory();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      ) : allEvents.length === 0 ? (
        <div className="empty-state">
          <p>{t('clinical.noEvents') || 'No clinical history records yet'}</p>
        </div>
      ) : (
        <EventTimeline
          events={allEvents}
          onEdit={(event) => {
            setEditingEvent(event);
            setFormType(event.type);
            setShowForm(true);
          }}
          onDelete={(eventId, eventType) => handleDeleteEvent(eventId, eventType)}
        />
      )}
    </div>
  );
}
