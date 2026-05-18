import { formatDate } from '../../utils/dateUtils';

const EVENT_TYPE_ICONS = {
  symptom: '🏥',
  consultation: '👨‍⚕️',
  vaccination: '💉',
  medication: '💊',
  appointment: '📅',
};

const EVENT_TYPE_LABELS = {
  symptom: 'Síntoma',
  consultation: 'Consulta',
  vaccination: 'Vacuna',
  medication: 'Medicamento',
  appointment: 'Cita',
};

export default function EventTimeline({ events, onEdit, onDelete }) {

  const getSeverityBadge = (severity) => {
    const colors = { mild: 'green', moderate: 'warning', severe: 'danger' };
    return (
      <span className={`badge badge-${colors[severity] || 'info'}`}>
        {severity?.toUpperCase()}
      </span>
    );
  };

  const renderEventContent = (event) => {
    switch (event.type) {
      case 'symptom':
        return (
          <div className="event-content">
            <h4>{event.symptomType}</h4>
            <p>{event.description}</p>
            {event.severity && getSeverityBadge(event.severity)}
            {event.resolved && <span className="badge badge-success">✓ Resuelto</span>}
            {event.notes && <p className="notes">{event.notes}</p>}
          </div>
        );
      case 'consultation':
        return (
          <div className="event-content">
            <h4>{event.reason}</h4>
            {event.vetName && <p><strong>Veterinario:</strong> {event.vetName}</p>}
            {event.clinicName && <p><strong>Clínica:</strong> {event.clinicName}</p>}
            {event.findings && <p><strong>Hallazgos:</strong> {event.findings}</p>}
            {event.recommendations && <p><strong>Recomendaciones:</strong> {event.recommendations}</p>}
          </div>
        );
      case 'vaccination':
        return (
          <div className="event-content">
            <h4>{event.vaccineName}</h4>
            {event.veterinarian && <p><strong>Veterinario:</strong> {event.veterinarian}</p>}
            {event.lotNumber && <p><strong>Lote:</strong> {event.lotNumber}</p>}
            {event.nextDueDate && (
              <p><strong>Próxima dosis:</strong> {formatDate(event.nextDueDate)}</p>
            )}
            {event.notes && <p className="notes">{event.notes}</p>}
          </div>
        );
      case 'medication':
        return (
          <div className="event-content">
            <h4>{event.medicationName}</h4>
            <p><strong>Dosis:</strong> {event.dosage}</p>
            <p><strong>Frecuencia:</strong> Cada {event.frequencyHours} horas</p>
            {event.endDate && (
              <p><strong>Finaliza:</strong> {formatDate(event.endDate)}</p>
            )}
            {event.status === 'completed' && (
              <span className="badge badge-success">✓ Completado</span>
            )}
            {event.notes && <p className="notes">{event.notes}</p>}
          </div>
        );
      case 'appointment':
        return (
          <div className="event-content">
            <h4>{event.title || 'Appointment'}</h4>
            {event.vetName && <p><strong>Veterinario:</strong> {event.vetName}</p>}
            {event.clinicName && <p><strong>Clínica:</strong> {event.clinicName}</p>}
            {event.appointmentType && <p><strong>Tipo:</strong> {event.appointmentType}</p>}
            {event.checklist?.length > 0 && (
              <ul className="checklist">
                {event.checklist.map((item, idx) => (
                  <li key={idx}>✓ {item}</li>
                ))}
              </ul>
            )}
            {event.notes && <p className="notes">{event.notes}</p>}
          </div>
        );
      default:
        return <div className="event-content"><p>Unknown event type</p></div>;
    }
  };

  return (
    <div className="event-timeline">
      {events.map((event, idx) => (
        <div key={event._id || idx} className="timeline-item">
          <div className="timeline-marker">
            <span className="event-icon">{EVENT_TYPE_ICONS[event.type] || '📋'}</span>
          </div>

          <div className="timeline-content">
            <div className="event-header">
              <span className="event-type">{EVENT_TYPE_LABELS[event.type]}</span>
              <span className="event-date">{formatDate(event.date)}</span>
            </div>

            {renderEventContent(event)}

            <div className="event-actions">
              <button
                className="btn-icon"
                onClick={() => onEdit(event)}
                title="Edit"
              >
                ✏️ Edit
              </button>
              <button
                className="btn-icon btn-danger"
                onClick={() => onDelete(event._id, event.type)}
                title="Delete"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
