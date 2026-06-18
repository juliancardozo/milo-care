import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { getPublicClinic, storeClinic } from '../services/clinicApi';
import { pawBadge } from '../components/ClinicQRCard';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/vet-panel.css';

// Entrada del QR / link de la clínica (/c/:slug). Guarda la atribución y muestra
// un splash co-branded antes de mandar al registro.
export default function ClinicLandingPage() {
  const { t } = useI18n();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const selfUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${slug}` : '';

  useEffect(() => {
    // Persistir atribución apenas entra (aunque la clínica no resuelva, no rompe).
    storeClinic(slug, searchParams.get('src') || 'qr');
    getPublicClinic(slug)
      .then(({ data }) => setClinic(data.clinic))
      .catch(() => setClinic(null))
      .finally(() => setLoading(false));
  }, [slug, searchParams]);

  function goRegister() {
    navigate('/register');
  }

  if (loading) {
    return <div className="page cl-landing"><div className="cl-card cl-skeleton" /></div>;
  }

  return (
    <div className="page cl-landing">
      <div className="cl-card" style={clinic?.brandColor ? { borderTopColor: clinic.brandColor } : undefined}>
        {clinic?.logoUrl
          ? <img className="cl-logo" src={clinic.logoUrl} alt={clinic.name} />
          : <span className="cl-paw" aria-hidden="true">🐾</span>}
        <p className="cl-kicker">{t('clinicLanding.kicker')}</p>
        <h1 className="cl-title">
          {clinic
            ? t('clinicLanding.titleWithClinic', { clinic: clinic.name })
            : t('clinicLanding.titleGeneric')}
        </h1>
        <p className="cl-sub">{t('clinicLanding.subtitle')}</p>
        <ul className="cl-bullets">
          <li>✅ {t('clinicLanding.bullet1')}</li>
          <li>🔔 {t('clinicLanding.bullet2')}</li>
          <li>🎁 {t('clinicLanding.bullet3')}</li>
        </ul>
        <button type="button" className="cl-cta" onClick={goRegister}>
          {t('clinicLanding.cta')}
        </button>

        <div className="cl-qr">
          <span className="cl-qr-caption">{t('clinicLanding.qrCaption')}</span>
          <div className="cl-qr-tile">
            <QRCodeCanvas
              value={selfUrl}
              size={132}
              level="H"
              bgColor="#ffffff"
              fgColor="#0c2440"
              imageSettings={{ src: pawBadge(clinic?.brandColor || '#4f8ef7'), height: 30, width: 30, excavate: true }}
            />
          </div>
        </div>

        <p className="cl-disclaimer">{t('clinicLanding.disclaimer')}</p>
      </div>
    </div>
  );
}
