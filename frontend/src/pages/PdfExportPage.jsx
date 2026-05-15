import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useI18n } from '../i18n/I18nProvider';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BackLink from '../components/BackLink';
import { selectSymptoms, selectConsultations, selectVaccinations, selectMedications, selectAppointments } from '../store/clinicalHistorySlice';
import PdfTemplate from '../components/pdf/PdfTemplate';
import '../styles/pdf-export.css';

export default function PdfExportPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const navigate = useNavigate();
  const templateRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dog, setDog] = useState(null);
  const [previewMode, setPreviewMode] = useState(true);

  const symptoms = useSelector(selectSymptoms);
  const consultations = useSelector(selectConsultations);
  const vaccinations = useSelector(selectVaccinations);
  const medications = useSelector(selectMedications);
  const appointments = useSelector(selectAppointments);

  useEffect(() => {
    // Load dog data
    // TODO: Fetch dog data from API
    setDog({
      name: 'Milo',
      breed: 'Labrador',
      dateOfBirth: '2020-01-15',
      sex: 'male',
      weightKg: 28,
      microchipId: '123456789',
      riskProfile: 'low',
    });
  }, [dogId]);

  async function handleGeneratePdf() {
    if (!templateRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Download
      pdf.save(`${dog?.name || 'Health-Summary'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      setError(err.message || 'Error generating PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pdf-export-page">
      <BackLink to={`/dogs/${dogId}`} label={t('common.backToDog') || 'Back to Dog'} />

      <header className="page-header">
        <h1>{t('pdf.title') || 'Health Summary PDF'}</h1>
        <div className="header-actions">
          <button
            className={`btn ${previewMode ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setPreviewMode(true)}
          >
            👁️ Preview
          </button>
          <button
            className={`btn ${!previewMode ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setPreviewMode(false)}
          >
            ⚙️ Settings
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGeneratePdf}
            disabled={loading}
          >
            {loading
              ? t('pdf.generating') || 'Generating...'
              : `📥 ${t('pdf.download') || 'Download PDF'}`}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {previewMode ? (
        <div className="pdf-preview">
          <PdfTemplate
            ref={templateRef}
            dog={dog}
            symptoms={symptoms}
            consultations={consultations}
            vaccinations={vaccinations}
            medications={medications}
            appointments={appointments}
          />
        </div>
      ) : (
        <div className="pdf-settings">
          <h3>{t('pdf.settings') || 'PDF Settings'}</h3>
          <p>{t('pdf.settingsDesc') || 'Customize what sections to include in the PDF'}</p>
          <div className="settings-coming-soon">
            Coming soon: customize sections, colors, branding
          </div>
        </div>
      )}
    </div>
  );
}
