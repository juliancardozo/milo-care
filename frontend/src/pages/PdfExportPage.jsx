import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useI18n } from '../i18n/I18nProvider';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BackLink from '../components/BackLink';
import { getDog } from '../services/api';
import {
  getAppointments,
  getConsultations,
  getMedications,
  getSymptoms,
  getVaccinations,
} from '../services/clinicalHistoryApi';
import {
  setAppointments,
  setConsultations,
  setMedications,
  setSymptoms,
  setVaccinations,
} from '../store/clinicalHistorySlice';
import { selectSymptoms, selectConsultations, selectVaccinations, selectMedications, selectAppointments } from '../store/clinicalHistorySlice';
import { getCheckinHistory } from '../services/checkinApi';
import PdfTemplate from '../components/pdf/PdfTemplate';
import '../styles/pdf-export.css';

export default function PdfExportPage() {
  const { t } = useI18n();
  const { dogId } = useParams();
  const dispatch = useDispatch();
  const templateRef = useRef(null);

  const previewWrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dog, setDog] = useState(null);
  const [checkins, setCheckins] = useState([]);

  const symptoms = useSelector(selectSymptoms);
  const consultations = useSelector(selectConsultations);
  const vaccinations = useSelector(selectVaccinations);
  const medications = useSelector(selectMedications);
  const appointments = useSelector(selectAppointments);

  useEffect(() => {
    async function loadPdfData() {
      if (!dogId) return;

      setLoading(true);
      setError(null);

      try {
        const [dogRes, symptomsRes, consultationsRes, vaccinationsRes, medicationsRes, appointmentsRes, checkinsRes] = await Promise.all([
          getDog(dogId),
          getSymptoms(dogId),
          getConsultations(dogId),
          getVaccinations(dogId),
          getMedications(dogId),
          getAppointments(dogId),
          getCheckinHistory(dogId).catch(() => ({ data: { checkins: [] } })),
        ]);

        setDog(dogRes.data || null);
        setCheckins(checkinsRes.data?.checkins || []);
        dispatch(setSymptoms(symptomsRes.data || []));
        dispatch(setConsultations(consultationsRes.data || []));
        dispatch(setVaccinations(vaccinationsRes.data || []));
        dispatch(setMedications(medicationsRes.data || []));
        dispatch(setAppointments(appointmentsRes.data || []));
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error loading PDF data');
      } finally {
        setLoading(false);
      }
    }

    loadPdfData();
  }, [dogId]);

  // El template se renderiza a ancho A4 fijo (794px) para que el PDF salga
  // siempre consistente; el preview se escala para entrar en cualquier viewport.
  useEffect(() => {
    const TEMPLATE_W = 794;
    function recompute() {
      const wrap = previewWrapRef.current;
      const el = templateRef.current;
      if (!wrap || !el) return;
      const s = Math.min(1, wrap.clientWidth / TEMPLATE_W);
      setScale(s);
      setScaledHeight(el.offsetHeight * s);
    }
    recompute();
    const tid = setTimeout(recompute, 300);
    window.addEventListener('resize', recompute);
    return () => { clearTimeout(tid); window.removeEventListener('resize', recompute); };
  }, [loading, dog, symptoms, consultations, vaccinations, medications, appointments, checkins]);

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

      <header className="pdfx-header">
        <h1>{t('pdf.title') || 'Resumen de salud'}</h1>
        <div className="pdfx-actions">
          <Link to={`/dogs/${dogId}/share`} className="pdfx-btn-ghost">
            🏥 {t('explore.vetShare.title')}
          </Link>
          <button className="pdfx-btn" onClick={handleGeneratePdf} disabled={loading}>
            {loading ? (t('pdf.generating') || 'Generando…') : `📥 ${t('pdf.download') || 'Descargar PDF'}`}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {!error && loading && <div className="loading">{t('common.loading') || 'Loading...'}</div>}

      {!loading ? (
        <div className="pdf-preview">
          <div className="pdf-measure" ref={previewWrapRef}>
            <div className="pdf-scaler" style={{ height: scaledHeight ?? undefined }}>
              <div className="pdf-scaler-inner" style={{ transform: `scale(${scale})` }}>
                <PdfTemplate
                  ref={templateRef}
                  dog={dog}
                  symptoms={symptoms}
                  consultations={consultations}
                  vaccinations={vaccinations}
                  medications={medications}
                  appointments={appointments}
                  checkins={checkins}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
