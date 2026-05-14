'use strict';

const PRIMARY = '#4f8ef7';
const PRIMARY_DARK = '#3370d4';
const TEXT = '#1a1a2e';
const MUTED = '#6b7280';
const BG = '#f9fafb';
const SURFACE = '#ffffff';
const BORDER = '#e5e7eb';

const PAW_SVG = `<svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="${SURFACE}" opacity="0.9"/>
  <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="${SURFACE}" opacity="0.9"/>
  <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="${SURFACE}" opacity="0.9"/>
  <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="${SURFACE}" opacity="0.9"/>
  <path d="M32 27 C20 27 12 34 12 43 C12 52 20 57 32 57 C44 57 52 52 52 43 C52 34 44 27 32 27Z" fill="${SURFACE}" opacity="0.9"/>
</svg>`;

/**
 * Wraps content in the standard Milo Care email layout.
 *
 * @param {object} options
 * @param {string} options.title         — email title (for <title> tag)
 * @param {string} options.preheader     — preview text shown by email clients
 * @param {string} options.body          — inner HTML content
 * @param {string} [options.ctaUrl]      — optional CTA button URL
 * @param {string} [options.ctaLabel]    — optional CTA button label
 * @returns {string} complete HTML email
 */
function layout({ title, preheader, body, ctaUrl, ctaLabel }) {
  const cta = ctaUrl && ctaLabel
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;
                  font-weight:600;font-size:15px;padding:13px 28px;border-radius:8px;">
          ${ctaLabel}
        </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
    a{color:${PRIMARY};}
  </style>
</head>
<body>
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${preheader}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${PRIMARY};border-radius:12px 12px 0 0;padding:20px 32px;text-align:left;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;">${PAW_SVG}</td>
                <td style="vertical-align:middle;">
                  <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Milo Care</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${SURFACE};padding:36px 40px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
            <div style="color:${TEXT};font-size:15px;line-height:1.7;">
              ${body}
            </div>
            ${cta}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BG};border:1px solid ${BORDER};border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:${MUTED};font-size:12px;">
              Milo Care — Salud preventiva para tu perro
            </p>
            <p style="margin:0;color:${MUTED};font-size:11px;">
              Recibís este correo porque tenés notificaciones habilitadas en tu cuenta.<br/>
              Podés desactivarlas desde la sección <strong>Preferencias de notificación</strong> en la app.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { layout, PRIMARY, PRIMARY_DARK };
