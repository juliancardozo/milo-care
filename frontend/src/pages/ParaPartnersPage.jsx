import { Link } from 'react-router-dom';
import '../styles/landing-v2.css';

const BRAND_SVG = (
  <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor" opacity=".9" />
  </svg>
);

const KEY_MAIL = 'mailto:hola@milocare.org?subject=Quiero%20mi%20API%20key%20de%20Milo%20Care&body=Organizaci%C3%B3n%3A%0ATipo%20(aseguradora%2Ffintech%2Fbanco)%3A%0ACaso%20de%20uso%3A';

const STEPS = [
  { n: '1', t: 'Pedinos tu API key', d: 'Nos escribís con tu caso de uso y te damos acceso al entorno con tu API key.' },
  { n: '2', t: 'Autenticate', d: 'API key (header X-API-Key o Bearer) para la API de partners; JWT del usuario para el panel.' },
  { n: '3', t: 'Usá la API de partners', d: 'Leé el nivel de certificado consentido, convertí leads, empujá eventos y consultá métricas agregadas.' },
  { n: '4', t: 'Recibí webhooks', d: 'Te avisamos en tiempo real cuando un tutor pide un seguro o comparte su certificado.' },
];

const CAPS = [
  { icon: '🔐', t: 'Autenticación', d: 'Dos vías: API key del partner (X-API-Key / Bearer) para la API server-to-server, y JWT del partner_admin para el panel de métricas y leads.' },
  { icon: '🧩', t: 'API de partners', d: 'Nivel de certificado consentido (/v1/pets/{id}/certificate), conversión de pólizas (/v1/leads/{id}/convert), ingesta de eventos (/v1/events) y métricas agregadas (/partners/{id}/metrics, /leads).' },
  { icon: '📡', t: 'Webhooks', d: 'Eventos salientes a tu webhookUrl: insurance_lead.created (un tutor pidió un seguro) y certificate.shared (compartió el nivel de su certificado). Con reintentos e idempotencia.' },
];

const GUARDRAILS = [
  ['🔒', 'Solo datos consentidos', 'Recibís el nivel del certificado y los leads únicamente con el consentimiento explícito del tutor. Nunca historia clínica individual.'],
  ['🧱', 'Aislamiento por partner', 'Cada API key ve solo su propia cartera. No se puede sondear datos de otro partner.'],
  ['🏷️', 'White-label opcional', 'Entregá Milo Care con tu marca a tus clientes — branding por slug, sin desarrollar nada desde cero.'],
];

function TopBar() {
  return (
    <nav className="landing-nav" aria-label="Navegación">
      <div className="landing-nav-inner">
        <Link to="/" className="landing-brand" style={{ textDecoration: 'none' }}>{BRAND_SVG}<span>Milo Care</span></Link>
        <div className="landing-nav-actions">
          <Link to="/developers" className="landing-nav-link">Documentación</Link>
          <a href={KEY_MAIL} className="landing-btn-primary landing-btn-sm">Pedir mi API key</a>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-brand" style={{ color: '#7dd3fc' }}>{BRAND_SVG}<span>Milo Care</span></div>
        <p className="landing-footer-copy">© 2026 Milocura · Plataforma API-first de salud de mascotas.</p>
        <div className="landing-footer-links">
          <Link to="/">Inicio</Link>
          <Link to="/developers">Developers</Link>
          <Link to="/para-veterinarias">Para veterinarias</Link>
          <a href="mailto:hola@milocare.org">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

export default function ParaPartnersPage() {
  return (
    <div className="landing-root">
      <TopBar />
      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
            <span className="landing-hero-badge">Para aseguradoras, fintechs y bancos · API-first</span>
            <h1 className="landing-hero-title">Integrá la salud y el Pet Score de las mascotas con tu producto.</h1>
            <p className="landing-hero-sub">
              Milo Care es la capa de salud e identidad de las mascotas: API REST, webhooks en
              tiempo real y datos consentidos. Para integrar, pedinos tu API key.
            </p>
            <div className="landing-hero-ctas">
              <a href={KEY_MAIL} className="landing-btn-primary landing-btn-lg">Pedir mi API key →</a>
              <Link to="/developers" className="landing-btn-ghost landing-btn-lg landing-hero-ghost">Ver la documentación</Link>
            </div>
            <p className="landing-hero-footnote">Documentación abierta · Sandbox para probar · Datos solo con consentimiento del tutor</p>
          </div>
        </section>

        {/* Pasos para integrar */}
        <section className="landing-section landing-section-alt" id="pasos" aria-labelledby="p-steps">
          <div className="landing-container">
            <span className="landing-eyebrow">Cómo integrar</span>
            <h2 id="p-steps" className="landing-section-title">De la API key al webhook, en cuatro pasos.</h2>
            <div className="landing-steps">
              {STEPS.map((s, i) => (
                <div key={s.n} className="landing-step">
                  <div className="landing-step-number">{s.n}</div>
                  {i < STEPS.length - 1 && <div className="landing-step-connector" />}
                  <div className="landing-step-content"><h3>{s.t}</h3><p>{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Qué incluye: auth, API, webhooks */}
        <section className="landing-section" aria-labelledby="p-caps">
          <div className="landing-container">
            <span className="landing-eyebrow">Qué incluye</span>
            <h2 id="p-caps" className="landing-section-title">Autenticación, API de partners y webhooks.</h2>
            <p className="landing-section-sub">
              Todo lo que necesitás para conectar Milo Care server-to-server, documentado y con
              ejemplos en el portal de developers.
            </p>
            <div className="landing-benefits-grid">
              {CAPS.map((c) => (
                <div key={c.t} className="landing-benefit-card">
                  <div className="landing-feature-icon" aria-hidden="true">{c.icon}</div>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '28px', textAlign: 'center' }}>
              <Link to="/developers" className="landing-btn-primary landing-btn-lg">Ver la documentación de la API →</Link>
            </div>
          </div>
        </section>

        {/* Guardrails / confianza */}
        <section className="landing-section landing-section-alt" aria-labelledby="p-guard">
          <div className="landing-container">
            <span className="landing-eyebrow">Confianza y privacidad</span>
            <h2 id="p-guard" className="landing-section-title">Datos consentidos, nunca clínicos.</h2>
            <div className="landing-why-grid">
              {GUARDRAILS.map((g) => (
                <div key={g[1]} className="landing-why-item">
                  <span className="landing-why-icon" aria-hidden="true">{g[0]}</span>
                  <div><h3>{g[1]}</h3><p>{g[2]}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="landing-cta-section" aria-labelledby="p-cta">
          <div className="landing-container landing-cta-inner">
            <h2 id="p-cta">¿Listos para integrar?</h2>
            <p>Contanos tu caso de uso y te damos tu API key para empezar a probar.</p>
            <a href={KEY_MAIL} className="landing-btn-white landing-btn-lg">Pedir mi API key →</a>
            <p style={{ marginTop: '14px', fontSize: '0.95rem', color: '#dbeafe' }}>
              <Link to="/developers" style={{ color: '#fff', fontWeight: 700 }}>Explorar la documentación primero →</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
