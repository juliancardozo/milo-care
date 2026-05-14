import { Link } from 'react-router-dom';
import PawCursorTrail from '../components/PawCursorTrail';

// ── Sub-components ────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-brand">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="#fff" opacity=".9"/>
            <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="#fff" opacity=".9"/>
            <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="#fff" opacity=".9"/>
            <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="#fff" opacity=".9"/>
            <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="#fff" opacity=".9"/>
          </svg>
          <span>Milo Care</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-nav-link">Iniciar sesión</Link>
          <Link to="/register" className="landing-btn-primary landing-btn-sm">Crear cuenta gratis</Link>
        </div>
      </div>
    </nav>
  );
}

const FLOATING_PAWS = [
  { x: '4%',  y: '75%', size: 22, opacity: 0.12, delay: '0s',    dur: '7s',  rotate: -25 },
  { x: '12%', y: '20%', size: 16, opacity: 0.09, delay: '2.1s',  dur: '9s',  rotate:  40 },
  { x: '22%', y: '55%', size: 28, opacity: 0.14, delay: '0.8s',  dur: '6s',  rotate: -10 },
  { x: '35%', y: '85%', size: 14, opacity: 0.08, delay: '3.5s',  dur: '8s',  rotate:  60 },
  { x: '48%', y: '15%', size: 20, opacity: 0.11, delay: '1.4s',  dur: '7.5s',rotate: -40 },
  { x: '58%', y: '70%', size: 32, opacity: 0.10, delay: '4.2s',  dur: '9.5s',rotate:  15 },
  { x: '68%', y: '35%', size: 18, opacity: 0.13, delay: '0.3s',  dur: '6.5s',rotate: -55 },
  { x: '78%', y: '80%', size: 24, opacity: 0.09, delay: '2.8s',  dur: '8s',  rotate:  30 },
  { x: '88%', y: '25%', size: 26, opacity: 0.15, delay: '1.0s',  dur: '7s',  rotate: -20 },
  { x: '93%', y: '60%', size: 15, opacity: 0.08, delay: '5.0s',  dur: '10s', rotate:  50 },
  { x: '42%', y: '45%', size: 12, opacity: 0.07, delay: '3.0s',  dur: '8.5s',rotate: -35 },
  { x: '74%', y: '10%', size: 20, opacity: 0.10, delay: '1.7s',  dur: '6s',  rotate:  20 },
];

const PAW_SVG_INLINE = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" fill="white">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5"/>
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5"/>
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5"/>
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5"/>
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z"/>
  </svg>
);

function Hero() {
  return (
    <section className="landing-hero">
      {/* Floating paw background */}
      <div aria-hidden="true" className="landing-hero-paws-bg">
        {FLOATING_PAWS.map((p, i) => (
          <span
            key={i}
            className="landing-hero-paw-float"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              '--delay': p.delay,
              '--dur': p.dur,
              '--rotate': `${p.rotate}deg`,
            }}
          >
            {PAW_SVG_INLINE}
          </span>
        ))}
      </div>

      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="landing-hero-badge">🐾 Salud preventiva para tu perro</div>
        <h1 className="landing-hero-title">
          El cuidado que tu perro<br className="landing-br"/>
          <span className="landing-hero-accent"> se merece</span>
        </h1>
        <p className="landing-hero-sub">
          Vacunas, medicamentos, citas y recordatorios. Todo organizado,
          todo a tiempo. Nunca más te olvidés de una dosis o un refuerzo.
        </p>
        <div className="landing-hero-ctas">
          <Link to="/register" className="landing-btn-primary landing-btn-lg">
            Empezar gratis →
          </Link>
          <a href="#como-funciona" className="landing-btn-ghost landing-btn-lg">
            Ver cómo funciona
          </a>
        </div>
        <p className="landing-hero-footnote">Sin tarjeta de crédito · Plan gratuito incluye 1 perro</p>
      </div>  {/* end landing-container */}
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: '✓', text: 'Basado en guías WSAVA 2022' },
    { icon: '✓', text: 'Normativa SENASA Argentina' },
    { icon: '✓', text: 'MGAP Uruguay' },
    { icon: '✓', text: 'Recordatorios automáticos por email' },
    { icon: '✓', text: 'Historial clínico completo' },
  ];
  return (
    <div className="landing-trust-bar">
      <div className="landing-container">
        <ul className="landing-trust-list">
          {items.map((item) => (
            <li key={item.text} className="landing-trust-item">
              <span className="landing-trust-icon">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Problem() {
  return (
    <section className="landing-section landing-section-alt">
      <div className="landing-container landing-two-col">
        <div className="landing-problem-text">
          <span className="landing-eyebrow">El problema</span>
          <h2>¿Cuándo fue la última vacuna de tu perro?</h2>
          <p>
            La información de salud de las mascotas suele estar fragmentada
            entre chats de WhatsApp, libretas en papel y la memoria de cada
            quien. Las vacunas vencen, los medicamentos se olvidan, las citas
            se pierden.
          </p>
          <p>
            Milo Care centraliza todo en un solo lugar y te avisa antes de que
            sea tarde — para que podás enfocarte en disfrutar a tu compañero.
          </p>
        </div>
        <div className="landing-problem-visual" aria-hidden="true">
          <div className="landing-problem-card">
            <span className="landing-problem-emoji">😰</span>
            <p>Sin Milo Care</p>
            <ul>
              <li>❌ Vacuna vencida sin saberlo</li>
              <li>❌ Medicamento olvidado</li>
              <li>❌ Historia clínica en papelitos</li>
              <li>❌ Ningún recordatorio de citas</li>
            </ul>
          </div>
          <div className="landing-problem-card landing-problem-card-good">
            <span className="landing-problem-emoji">😌</span>
            <p>Con Milo Care</p>
            <ul>
              <li>✅ Calendario vacunal automático</li>
              <li>✅ Recordatorios antes de cada dosis</li>
              <li>✅ Historial completo en un lugar</li>
              <li>✅ Alertas 7 días antes del vencimiento</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: '💉',
    title: 'Calendario vacunal inteligente',
    desc: 'Esquema personalizado según edad, raza y país. Basado en normativa SENASA y guías WSAVA 2022. Diferencia vacunas aplicadas de las sugeridas.',
  },
  {
    icon: '🔔',
    title: 'Recordatorios automáticos',
    desc: 'Recibís emails antes del vencimiento de vacunas, medicamentos y citas. Sin configurar nada — el sistema los calcula solo.',
  },
  {
    icon: '💊',
    title: 'Control de medicamentos',
    desc: 'Registrá cada medicamento con dosis, frecuencia y fecha de fin. El sistema avisa cuándo es cada toma y marca el estado activo/completado.',
  },
  {
    icon: '🏥',
    title: 'Historial de consultas',
    desc: 'Organizá todas las visitas al veterinario con tipo de consulta (control sano, urgencia, seguimiento), checklist clínico y notas.',
  },
  {
    icon: '🩺',
    title: 'Registro de síntomas',
    desc: 'Documentá síntomas con severidad. El sistema aplica alertas adaptadas al fenotipo y raza de tu perro para detectar señales de riesgo a tiempo.',
  },
  {
    icon: '📋',
    title: 'Historial clínico completo',
    desc: 'Toda la historia de salud de tu perro en un solo lugar. Vacunas, medicamentos, citas y síntomas, separados por fechas y ordenados.',
  },
];

function Features() {
  return (
    <section className="landing-section" id="funcionalidades">
      <div className="landing-container">
        <span className="landing-eyebrow">Funcionalidades</span>
        <h2 className="landing-section-title">Todo lo que necesitás para cuidar bien a tu perro</h2>
        <p className="landing-section-sub">
          Diseñado para tutores que quieren prevenir antes que curar.
        </p>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { n: '1', title: 'Creá tu cuenta', desc: 'Gratis, en menos de un minuto. Sin tarjeta de crédito.' },
  { n: '2', title: 'Cargá el perfil de tu perro', desc: 'Raza, edad, historial de vacunas y estilo de vida.' },
  { n: '3', title: 'El sistema genera el calendario', desc: 'Personalizado según normativa y perfil de riesgo de tu perro.' },
  { n: '4', title: 'Recibís recordatorios a tiempo', desc: 'Por email, antes de cada vencimiento. Todo automático.' },
];

function HowItWorks() {
  return (
    <section className="landing-section landing-section-alt" id="como-funciona">
      <div className="landing-container">
        <span className="landing-eyebrow">Cómo funciona</span>
        <h2 className="landing-section-title">Empezar toma menos de 5 minutos</h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-number">{s.n}</div>
              {i < STEPS.length - 1 && <div className="landing-step-connector" aria-hidden="true"/>}
              <div className="landing-step-content">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className="landing-section" id="precios">
      <div className="landing-container">
        <span className="landing-eyebrow">Planes</span>
        <h2 className="landing-section-title">Simple y sin sorpresas</h2>
        <p className="landing-section-sub">
          Empezá gratis. Suscribite cuando necesitás más.
        </p>
        <div className="landing-pricing-grid">

          <div className="landing-pricing-card">
            <div className="landing-pricing-plan">Free</div>
            <div className="landing-pricing-price">
              <span className="landing-pricing-amount">$0</span>
              <span className="landing-pricing-period">/ siempre</span>
            </div>
            <ul className="landing-pricing-features">
              <li>✓ 1 perro</li>
              <li>✓ Vacunas y medicamentos</li>
              <li>✓ Recordatorios por email</li>
              <li>✓ Historial completo</li>
              <li>✓ Registro de síntomas</li>
              <li className="landing-pricing-no">✗ Citas con checklist WSAVA</li>
              <li className="landing-pricing-no">✗ Alertas por raza</li>
              <li className="landing-pricing-no">✗ Múltiples perros</li>
            </ul>
            <Link to="/register" className="landing-btn-ghost landing-btn-full">
              Empezar gratis
            </Link>
          </div>

          <div className="landing-pricing-card landing-pricing-card-featured">
            <div className="landing-pricing-badge">Más popular</div>
            <div className="landing-pricing-plan">Premium</div>
            <div className="landing-pricing-price">
              <span className="landing-pricing-amount">$4.99</span>
              <span className="landing-pricing-period">USD / mes</span>
            </div>
            <ul className="landing-pricing-features">
              <li>✓ <strong>Perros ilimitados</strong></li>
              <li>✓ Vacunas y medicamentos</li>
              <li>✓ Recordatorios por email</li>
              <li>✓ Historial completo</li>
              <li>✓ Registro de síntomas</li>
              <li>✓ <strong>Citas con checklist WSAVA</strong></li>
              <li>✓ <strong>Alertas por raza y fenotipo</strong></li>
              <li>✓ <strong>Soporte prioritario</strong></li>
            </ul>
            <Link to="/register" className="landing-btn-primary landing-btn-full">
              Empezar con Premium →
            </Link>
          </div>

        </div>
        <p className="landing-pricing-note">
          Precios en USD. Facturación mensual. Cancelá cuando quieras.
        </p>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="landing-cta-section">
      <div className="landing-container landing-cta-inner">
        <span style={{ fontSize: '3rem' }} aria-hidden="true">🐾</span>
        <h2>Tu perro te lo va a agradecer</h2>
        <p>
          Registrate hoy en menos de un minuto. Es gratis y no necesitás tarjeta de crédito.
        </p>
        <Link to="/register" className="landing-btn-white landing-btn-lg">
          Crear cuenta gratuita →
        </Link>
        <p style={{ marginTop: '12px', fontSize: '0.875rem', opacity: 0.75 }}>
          ¿Ya tenés cuenta? <Link to="/login" style={{ color: '#fff', fontWeight: 600 }}>Iniciá sesión</Link>
        </p>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-brand" style={{ color: 'var(--color-muted)' }}>
          🐾 <span>Milo Care</span>
        </div>
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Milo Care. Salud preventiva para tu perro.<br/>
          Basado en guías WSAVA 2022 · Normativa SENASA · MGAP Uruguay
        </p>
        <div className="landing-footer-links">
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/register">Registrarse</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-root">
      <PawCursorTrail />
      <LandingNav />
      <main>
        <Hero />
        <TrustBar />
        <Problem />
        <Features />
        <HowItWorks />
        <Pricing />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
