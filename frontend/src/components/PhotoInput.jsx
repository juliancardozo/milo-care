import { useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { fileToCompressedDataUrl, isMobile } from '../utils/imageCapture';

/**
 * Selector de foto reutilizable. En mobile ofrece "Tomar foto" (abre la cámara
 * vía capture) además de "Elegir foto". La imagen se comprime en el cliente y se
 * entrega como data-URL por onChange. Muestra preview.
 */
export default function PhotoInput({ value, onChange }) {
  const { t } = useI18n();
  const camRef = useRef(null);
  const galRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const mobile = isMobile();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch {
      // ignorar archivos inválidos
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photoinput">
      {value && <img className="photoinput-preview" src={value} alt="" />}

      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
      <input ref={galRef} type="file" accept="image/*" hidden onChange={handleFile} />

      <div className="photoinput-actions">
        {mobile && (
          <button type="button" className="photoinput-btn primary" disabled={busy} onClick={() => camRef.current?.click()}>
            {busy ? t('photo.processing') : t('photo.takePhoto')}
          </button>
        )}
        <button type="button" className="photoinput-btn" disabled={busy} onClick={() => galRef.current?.click()}>
          {busy ? t('photo.processing') : (value ? t('photo.change') : t('photo.choose'))}
        </button>
      </div>

      {value && (
        <button type="button" className="photoinput-remove" onClick={() => onChange('')}>{t('photo.remove')}</button>
      )}
    </div>
  );
}
