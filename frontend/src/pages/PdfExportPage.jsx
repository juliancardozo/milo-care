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
import { shareDogWhatsapp } from '../services/partnerApi';
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
  const [zoom, setZoom] = useState('fit'); // 'fit' | 'full'

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dog, setDog] = useState(null);
  const [checkins, setCheckins] = useState([]);

  // Blindaje: el store podría tener una forma inesperada si otra página la dejó.
  const toArr = (v) => (Array.isArray(v) ? v : []);
  const symptoms = toArr(useSelector(selectSymptoms));
  const consultations = toArr(useSelector(selectConsultations));
  const vaccinations = toArr(useSelector(selectVaccinations));
  const medications = toArr(useSelector(selectMedications));
  const appointments = toArr(useSelector(selectAppointments));

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

        // Los endpoints devuelven el array envuelto ({ medications: [...] }),
        // salvo consultations que es array directo. Extraemos siempre un array
        // para que el store nunca guarde un objeto (rompería .filter/.map).
        const arr = (v) => (Array.isArray(v) ? v : []);
        const pick = (data, key) => arr(data?.[key] ?? data);

        setDog(dogRes.data || null);
        setCheckins(pick(checkinsRes.data, 'checkins'));
        dispatch(setSymptoms(pick(symptomsRes.data, 'symptoms')));
        dispatch(setConsultations(pick(consultationsRes.data, 'consultations')));
        dispatch(setVaccinations(pick(vaccinationsRes.data, 'vaccinations')));
        dispatch(setMedications(pick(medicationsRes.data, 'medications')));
        dispatch(setAppointments(pick(appointmentsRes.data, 'appointments')));
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
  // En modo 'full' se muestra a tamaño real (scroll horizontal) para leerlo en mobile.
  useEffect(() => {
    const TEMPLATE_W = 794;
    function recompute() {
      const wrap = previewWrapRef.current;
      const el = templateRef.current;
      if (!wrap || !el) return;
      const s = zoom === 'full' ? 1 : Math.min(1, wrap.clientWidth / TEMPLATE_W);
      setScale(s);
      setScaledHeight(el.offsetHeight * s);
    }
    recompute();
    const tid = setTimeout(recompute, 300);
    window.addEventListener('resize', recompute);
    return () => { clearTimeout(tid); window.removeEventListener('resize', recompute); };
  }, [zoom, loading, dog, symptoms, consultations, vaccinations, medications, appointments, checkins]);

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

  async function handleShareWhatsapp() {
    try {
      const recordUrl = `${window.location.origin}/dogs/${dogId}`;
      const { data } = await shareDogWhatsapp(dogId, { recordUrl });
      window.open(data.link, '_blank', 'noopener');
    } catch (err) {
      if (err.response?.data?.code === 'UPGRADE_REQUIRED') {
        setError(t('pdf.upgradeRequired') || 'Compartir por WhatsApp requiere Premium.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error sharing');
      }
    }
  }

  const activeMeds = medications.filter((m) => m.status === 'active').length;
  const summaryItems = [
    { icon: '📋', label: t('pdf.includes.profile'), count: dog ? 1 : 0, always: true },
    { icon: '💉', label: t('pdf.includes.vaccinations'), count: vaccinations.length },
    { icon: '💊', label: t('pdf.includes.medications'), count: activeMeds },
    { icon: '🏥', label: t('pdf.includes.symptoms'), count: symptoms.length },
    { icon: '👨‍⚕️', label: t('pdf.includes.consultations'), count: consultations.length },
    { icon: '📅', label: t('pdf.includes.appointments'), count: appointments.length },
    { icon: '🐾', label: t('pdf.includes.checkins'), count: checkins.length },
  ];

  const downloadLabel = loading
    ? (t('pdf.generating') || 'Generando…')
    : `📥 ${t('pdf.download') || 'Descargar PDF'}`;

  return (
    <div className="pdf-export-page">
      <BackLink to={`/dogs/${dogId}`} label={t('common.backToDog') || 'Back to Dog'} />

      <header className="pdfx-header">
        <div className="pdfx-heading">
          <h1>{t('pdf.title') || 'Resumen de salud'}</h1>
          <p className="pdfx-subtitle">{t('pdf.pageSubtitle')}</p>
        </div>
        <div className="pdfx-actions pdfx-actions-desktop">
          <Link to={`/dogs/${dogId}/share`} className="pdfx-btn-ghost">
            🏥 {t('explore.vetShare.title')}
          </Link>
          <button className="pdfx-btn-ghost" onClick={handleShareWhatsapp}>
            💬 {t('pdf.shareWhatsapp') || 'WhatsApp'}
          </button>
          <button className="pdfx-btn" onClick={handleGeneratePdf} disabled={loading}>
            {downloadLabel}
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="pdfx-skeleton">
          <div className="pdfx-skeleton-summary" />
          <div className="pdfx-skeleton-page" />
        </div>
      ) : (
        <>
          {/* Resumen de lo que incluye el PDF */}
          <section className="pdfx-summary card">
            <h2 className="pdfx-summary-title">{t('pdf.includesTitle')}</h2>
            <div className="pdfx-chips">
              {summaryItems
                .filter((it) => it.always || it.count > 0)
                .map((it) => (
                  <span key={it.label} className="pdfx-chip">
                    <span className="pdfx-chip-icon" aria-hidden="true">{it.icon}</span>
                    {it.label}
                    {!it.always && <span className="pdfx-chip-count">{it.count}</span>}
                  </span>
                ))}
            </div>
          </section>

          {/* Vista previa */}
          <section className="pdf-preview">
            <div className="pdfx-preview-bar">
              <span className="pdfx-preview-label">{t('pdf.previewLabel')}</span>
              <div className="pdfx-zoom" role="group" aria-label={t('pdf.zoom.label')}>
                <button
                  type="button"
                  className={`pdfx-zoom-btn ${zoom === 'fit' ? 'pdfx-zoom-on' : ''}`}
                  onClick={() => setZoom('fit')}
                >
                  {t('pdf.zoom.fit')}
                </button>
                <button
                  type="button"
                  className={`pdfx-zoom-btn ${zoom === 'full' ? 'pdfx-zoom-on' : ''}`}
                  onClick={() => setZoom('full')}
                >
                  {t('pdf.zoom.full')}
                </button>
              </div>
            </div>

            <div className={`pdf-measure ${zoom === 'full' ? 'pdf-measure-scroll' : ''}`} ref={previewWrapRef}>
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
          </section>
        </>
      )}

      {/* Barra de acción fija (mobile): el CTA siempre a mano */}
      <div className="pdfx-actionbar-mobile">
        <Link to={`/dogs/${dogId}/share`} className="pdfx-btn-ghost">🏥</Link>
        <button className="pdfx-btn-ghost" onClick={handleShareWhatsapp}>💬</button>
        <button className="pdfx-btn" onClick={handleGeneratePdf} disabled={loading}>
          {downloadLabel}
        </button>
      </div>
    </div>
  );
}
