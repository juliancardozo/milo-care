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

const VET_REGISTER = '/vet-portal/register';
const VET_MAIL = 'mailto:hola@milocare.org?subject=Quiero%20sumar%20mi%20cl%C3%ADnica%20a%20Milo%20Care';

const STEPS = [
  { n: '1', t: 'Registrá tu clínica', d: 'Creás tu cuenta y tu clínica en minutos. Gratis, sin tarjeta.' },
  { n: '2', t: 'Compartí tu link y QR', d: 'Te damos un link, un QR para la sala de espera y un texto listo para WhatsApp.' },
  { n: '3', t: 'Tus clientes se suman', d: 'Cuando entran por tu link reciben 30 días de Premium gratis y quedan asociados a tu clínica.' },
  { n: '4', t: 'Seguí y certificá', d: 'Ves tu panel de impacto, contactás a los que tienen algo por vencer y firmás sus carnets.' },
];

const BENEFITS = [
  { icon: '📋', t: 'Pacientes con el historial al día', d: 'Llegan a la consulta con vacunas, síntomas y tratamientos ordenados. Menos tiempo reconstruyendo.' },
  { icon: '📈', t: 'Panel de impacto', d: 'Cuántos dueños trajiste, cuáles están activos y al día, y a quién conviene contactar este mes.' },
  { icon: '🏅', t: 'Sello de confianza', d: 'Firmás vacunas y desparasitaciones y elevás el nivel del Pet Score de tus pacientes. Diferenciación real.' },
  { icon: '🔁', t: 'Fidelización y referidos', d: 'Tus clientes vuelven con todo en orden, y vos quedás como su clínica de cabecera en la app.' },
  { icon: '⏰', t: 'Recordatorios que recuperan turnos', d: 'La app avisa antes de cada vencimiento. Vos ves quién tiene un refuerzo pendiente y lo llamás.' },
  { icon: '🆓', t: 'Gratis para empezar', d: 'El plan Starter no tiene costo: panel, QR, atribución y recordatorios incluidos.' },
];

const PLANS = [
  { name: 'Starter', price: '$0', note: 'Para empezar hoy', feats: ['Panel de impacto', 'Link + QR + WhatsApp', 'Atribución de clientes', 'Recordatorios automáticos'], cta: 'Registrar mi clínica', to: VET_REGISTER, featured: false },
  { name: 'Pro', price: 'USD 24', per: '/mes', note: 'Más completo', feats: ['Todo lo de Starter', 'Certificación del Pet Score', 'Expediente con tu marca', 'Multi-veterinario', 'Soporte prioritario'], cta: 'Hablar con el equipo', mail: VET_MAIL, featured: true },
];

function TopBar() {
  return (
    <nav className="landing-nav" aria-label="Navegación">
      <div className="landing-nav-inner">
        <Link to="/" className="landing-brand" style={{ textDecoration: 'none' }}>{BRAND_SVG}<span>Milo Care</span></Link>
        <div className="landing-nav-actions">
          <Link to="/" className="landing-nav-link">Inicio</Link>
          <Link to={VET_REGISTER} className="landing-btn-primary landing-btn-sm">Registrar mi clínica</Link>
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
        <p className="landing-footer-copy">© 2026 Milocura · Para veterinarias del Río de la Plata.</p>
        <div className="landing-footer-links">
          <Link to="/">Inicio</Link>
          <Link to="/para-partners">Para integradores</Link>
          <a href="mailto:hola@milocare.org">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

export default function ParaVeterinariasPage() {
  return (
    <div className="landing-root">
      <TopBar />
      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
            <span className="landing-hero-badge">🏥 Para veterinarias y clínicas</span>
            <h1 className="landing-hero-title">Tus pacientes llegan con el historial al día.</h1>
            <p className="landing-hero-sub">
              Sumá tu clínica al Kit de Activación de Milo Care: traés clientes, seguís su cuidado
              entre consultas y certificás su carnet. Gratis para empezar.
            </p>
            <div className="landing-hero-ctas">
              <Link to={VET_REGISTER} className="landing-btn-primary landing-btn-lg">Registrar mi clínica gratis →</Link>
              <a href="#pasos" className="landing-btn-ghost landing-btn-lg landing-hero-ghost">Ver cómo funciona</a>
            </div>
            <p className="landing-hero-footnote">Sin tarjeta de crédito · Plan Starter sin costo · Argentina y Uruguay</p>
          </div>
        </section>

        {/* Pasos — qué tenés que hacer */}
        <section className="landing-section landing-section-alt" id="pasos" aria-labelledby="vet-steps">
          <div className="landing-container">
            <span className="landing-eyebrow">Cómo empezar</span>
            <h2 id="vet-steps" className="landing-section-title">Cuatro pasos para beneficiarte.</h2>
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

        {/* Beneficios */}
        <section className="landing-section" aria-labelledby="vet-benefits">
          <div className="landing-container">
            <span className="landing-eyebrow">Qué ganás</span>
            <h2 id="vet-benefits" className="landing-section-title">Una herramienta que trabaja para tu clínica.</h2>
            <div className="landing-features-grid landing-features-grid-3">
              {BENEFITS.map((b) => (
                <div key={b.t} className="landing-feature-card">
                  <div className="landing-feature-icon">{b.icon}</div>
                  <h3>{b.t}</h3>
                  <p>{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Intercambio de valor */}
        <section className="landing-section landing-section-alt" aria-labelledby="vet-deal">
          <div className="landing-container landing-story">
            <span className="landing-eyebrow">El trato</span>
            <h2 id="vet-deal" className="landing-section-title">Vos traés cuidado. Nosotros te damos herramientas.</h2>
            <p>
              Tu clínica trae dueños a Milo Care y los acompaña entre consultas. A cambio, recibís
              gratis el panel, los recordatorios y el sello de confianza del Pet Score — y tus
              pacientes llegan mejor preparados a cada visita.
            </p>
            <p className="landing-story-close">
              <strong>Sos su clínica de cabecera en la app.</strong> El cliente vuelve con todo en
              orden, y vos quedás en el centro de su cuidado.
            </p>
          </div>
        </section>

        {/* Planes */}
        <section className="landing-section" aria-labelledby="vet-plans">
          <div className="landing-container">
            <span className="landing-eyebrow">Planes para clínicas</span>
            <h2 id="vet-plans" className="landing-section-title">Empezá gratis. Crecé con Pro.</h2>
            <div className="landing-plans-grid" style={{ maxWidth: 720, margin: '0 auto' }}>
              {PLANS.map((p) => (
                <div key={p.name} className={`landing-plan-card${p.featured ? ' landing-plan-featured' : ''}`}>
                  {p.featured && <span className="landing-plan-ribbon">{p.note}</span>}
                  <h3 className="landing-plan-name">{p.name}</h3>
                  <div className="landing-plan-price">{p.price}<span>{p.per || ''}</span></div>
                  {!p.featured && <p className="landing-plan-note">{p.note}</p>}
                  <ul className="landing-plan-feats">{p.feats.map((f) => <li key={f}><span aria-hidden="true">✓</span> {f}</li>)}</ul>
                  {p.to
                    ? <Link to={p.to} className={p.featured ? 'landing-btn-primary landing-btn-full' : 'landing-btn-ghost landing-btn-full'}>{p.cta}</Link>
                    : <a href={p.mail} className={p.featured ? 'landing-btn-primary landing-btn-full' : 'landing-btn-ghost landing-btn-full'}>{p.cta}</a>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="landing-cta-section" aria-labelledby="vet-cta">
          <div className="landing-container landing-cta-inner">
            <h2 id="vet-cta">Sumá tu clínica en minutos.</h2>
            <p>Gratis, sin tarjeta. Empezá a traer y cuidar clientes hoy.</p>
            <Link to={VET_REGISTER} className="landing-btn-white landing-btn-lg">Registrar mi clínica gratis →</Link>
            <p style={{ marginTop: '14px', fontSize: '0.95rem', color: '#dbeafe' }}>
              ¿Dudas? <a href={VET_MAIL} style={{ color: '#fff', fontWeight: 700 }}>Escribinos →</a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
