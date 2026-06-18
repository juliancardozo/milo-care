import { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { useI18n } from '../i18n/I18nProvider';

const DEFAULT_BRAND = '#4f8ef7';

function brandRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return { r: 79, g: 142, b: 247 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function darken({ r, g, b }, amount = 0.4) {
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}
const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

// Marca central del QR (badge con pata) como data-URL SVG — usada por la landing.
export function pawBadge(color) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
    <rect width='64' height='64' rx='17' fill='${color}'/>
    <ellipse cx='32' cy='41' rx='13' ry='10' fill='#fff'/>
    <circle cx='17' cy='29' r='5.4' fill='#fff'/>
    <circle cx='26.5' cy='22' r='5.4' fill='#fff'/>
    <circle cx='37.5' cy='22' r='5.4' fill='#fff'/>
    <circle cx='47' cy='29' r='5.4' fill='#fff'/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Marca de pata en DOM puro (la captura html2canvas de forma fiable, sin canvas/SVG).
function PawMark() {
  return (
    <span className="qrc-mark" aria-hidden="true">
      <span className="qrc-badge">
        <i className="qrc-toe qrc-toe-1" />
        <i className="qrc-toe qrc-toe-2" />
        <i className="qrc-toe qrc-toe-3" />
        <i className="qrc-toe qrc-toe-4" />
        <i className="qrc-pad" />
      </span>
    </span>
  );
}

/**
 * Tarjeta de QR co-branded para la clínica (mostrador / carnet).
 * El QR se renderiza a PNG (canvas offscreen) y se muestra como <img> para que
 * la descarga/impresión vía html2canvas lo incluya siempre.
 */
export default function ClinicQRCard({ clinic, url, compact = false }) {
  const { t } = useI18n();
  const cardRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const [qrPng, setQrPng] = useState('');
  const [busy, setBusy] = useState(false);

  const brand = clinic?.brandColor || DEFAULT_BRAND;
  const rgb = brandRgb(brand);
  const brandStyle = {
    '--qrc-brand': brand,
    '--qrc-brand-dark': darken(rgb, 0.42),
    '--qrc-tint': rgba(rgb, 0.16),
    '--qrc-url-bg': rgba(rgb, 0.12),
    '--qrc-url-border': rgba(rgb, 0.28),
  };
  const prettyUrl = (url || '').replace(/^https?:\/\//, '');

  // El QR offscreen es un canvas limpio (sin imágenes embebidas → nunca tainted):
  // lo pasamos a PNG y lo mostramos como <img>.
  useEffect(() => {
    const id = setTimeout(() => {
      try { if (qrCanvasRef.current) setQrPng(qrCanvasRef.current.toDataURL('image/png')); } catch { /* noop */ }
    }, 60);
    return () => clearTimeout(id);
  }, [url]);

  async function toCanvas() {
    return html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true, logging: false });
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const canvas = await toCanvas();
      const link = document.createElement('a');
      link.download = `milo-qr-${clinic?.slug || 'clinica'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setBusy(false);
    }
  }

  async function handlePrint() {
    setBusy(true);
    try {
      const canvas = await toCanvas();
      const img = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(
        `<html><head><title>${clinic?.name || 'Milo Care'} — QR</title>
         <style>@page{margin:14mm} body{margin:0;display:flex;justify-content:center;align-items:flex-start}
         img{width:78mm;height:auto}</style></head>
         <body><img src="${img}" onload="window.focus();window.print();" /></body></html>`
      );
      w.document.close();
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <div className="qrc-actions" data-html2canvas-ignore>
      <button type="button" className="qrc-btn" onClick={handleDownload} disabled={busy || !qrPng}>
        ⬇ {t('qrCard.download')}
      </button>
      <button type="button" className="qrc-btn qrc-btn-ghost" onClick={handlePrint} disabled={busy || !qrPng}>
        🖨 {t('qrCard.print')}
      </button>
    </div>
  );

  const fullCard = (
    <div className="qrc-card" ref={cardRef} style={brandStyle}>
      <span className="qrc-paw qrc-paw-1" aria-hidden="true">🐾</span>
      <span className="qrc-paw qrc-paw-2" aria-hidden="true">🐾</span>

      <header className="qrc-head">
        {clinic?.logoUrl
          ? <img className="qrc-logo" src={clinic.logoUrl} alt={clinic.name} crossOrigin="anonymous" />
          : <span className="qrc-host">{clinic?.name}</span>}
        <span className="qrc-presents">{t('qrCard.presents')}</span>
      </header>

      <h2 className="qrc-headline">{t('qrCard.headline')}</h2>
      <p className="qrc-sub">{t('qrCard.sub')}</p>

      <div className="qrc-tile">
        <div className="qrc-qrbox">
          {qrPng && <img className="qrc-qr" src={qrPng} width={196} height={196} alt="QR" />}
          <PawMark />
        </div>
      </div>

      <p className="qrc-scan"><span aria-hidden="true">📷</span> {t('qrCard.scanHint')}</p>

      <footer className="qrc-foot">
        <span className="qrc-url">{prettyUrl}</span>
        <span className="qrc-courtesy">{t('qrCard.courtesy', { clinic: clinic?.name || '' })}</span>
        <span className="qrc-brandmark">🐾 Milo Care</span>
      </footer>
    </div>
  );

  // El QR offscreen de alta resolución es la fuente del PNG (canvas limpio).
  const offscreenQr = (
    <div style={{ position: 'absolute', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden="true">
      <QRCodeCanvas ref={qrCanvasRef} value={url} size={560} level="H" bgColor="#ffffff" fgColor="#0c2440" />
    </div>
  );

  // Modo compacto: la tarjeta completa queda offscreen (sólo para exportar) y se
  // muestra un QR chico + acciones, para que el panel entre sin scroll.
  if (compact) {
    return (
      <div className="qrc-wrap qrc-compact">
        {offscreenQr}
        <div className="qrc-cardholder">{fullCard}</div>
        <div className="qrc-mini">
          <div className="qrc-mini-qr">
            {qrPng && <img className="qrc-qr-sm" src={qrPng} alt="QR" />}
          </div>
          <div className="qrc-mini-body">
            <strong className="qrc-mini-title">{t('qrCard.miniTitle')}</strong>
            <span className="qrc-mini-url">{prettyUrl}</span>
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qrc-wrap">
      {offscreenQr}
      {fullCard}
      {actions}
    </div>
  );
}
