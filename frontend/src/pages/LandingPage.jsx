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
        <div className="landing-hero-badge">🐾 El copiloto de salud preventiva para tu perro</div>
        <h1 className="landing-hero-title">
          Organizá la salud de tu perro,<br className="landing-br"/>
          <span className="landing-hero-accent"> sin olvidos ni estrés</span>
        </h1>
        <p className="landing-hero-sub">
          Vacunas, medicamentos, síntomas e historial clínico en un solo lugar.
          Te ayudamos a organizarte, recordarte lo importante y prepararte mejor
          para cada visita al veterinario.
        </p>
        <div className="landing-hero-ctas">
          <Link to="/register" className="landing-btn-primary landing-btn-lg">
            Empezar gratis →
          </Link>
          <a href="#para-quien" className="landing-btn-ghost landing-btn-lg">
            Ver para quién es
          </a>
        </div>
        <p className="landing-hero-footnote">Sin tarjeta de crédito · Plan gratuito incluye 1 perro</p>
      </div>
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

const SEGMENTS = [
  {
    icon: '🐶',
    tag: 'Tenés un cachorro',
    title: 'Sabé qué vacunas van, cuándo desparasitar y qué controles hacer',
    pain: 'No saber qué es normal y qué no genera mucha ansiedad en los primeros meses.',
    message: 'Cargá la edad de tu cachorro y Milo Care te arma el calendario inicial de cuidado.',
  },
  {
    icon: '💊',
    tag: 'Perro adulto con tratamiento',
    title: 'Tené el tratamiento, síntomas y evolución en un solo lugar',
    pain: 'Medicamentos, gotas, controles, alergias — demasiadas cosas para rastrear en el día a día.',
    message: 'Tené el tratamiento, síntomas y evolución de tu perro en un solo lugar.',
  },
  {
    icon: '🧳',
    tag: 'Viajás o te mudás con tu perro',
    title: 'Llevá el historial de tu perro siempre con vos',
    pain: 'Vacunas, carnet, antiparasitarios, certificados — cada veterinaria nueva pide la historia desde cero.',
    message: 'Llevá el historial de tu perro siempre contigo, ordenado y listo para compartir.',
  },
];

function Segments() {
  return (
    <section className="landing-section" id="para-quien">
      <div className="landing-container">
        <span className="landing-eyebrow">¿Para quién es Milo Care?</span>
        <h2 className="landing-section-title">Diseñado para cada etapa de la vida de tu perro</h2>
        <p className="landing-section-sub">
          No importa si es cachorro, adulto o viejo — siempre hay algo que organizar.
        </p>
        <div className="landing-segments-grid">
          {SEGMENTS.map((s) => (
            <div key={s.tag} className="landing-segment-card">
              <div className="landing-segment-icon">{s.icon}</div>
              <span className="landing-segment-tag">{s.tag}</span>
              <h3>{s.title}</h3>
              <p className="landing-segment-pain">{s.pain}</p>
              <blockquote className="landing-segment-quote">{s.message}</blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
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
    title: 'Calendario vacunal personalizado',
    desc: 'Esquema adaptado a la edad, raza y país. Basado en normativa SENASA y guías WSAVA 2022. Separa vacunas aplicadas de las sugeridas.',
  },
  {
    icon: '🔔',
    title: 'Recordatorios automáticos',
    desc: 'Recibís emails antes del vencimiento de vacunas, medicamentos y citas. Sin configurar nada — el sistema los calcula solo.',
  },
  {
    icon: '💊',
    title: 'Control de medicamentos',
    desc: 'Registrá cada medicamento con dosis, frecuencia y fecha de fin. El sistema avisa cuándo es cada toma y lleva el estado activo/completado.',
  },
  {
    icon: '🏥',
    title: 'Historial de consultas',
    desc: 'Organizá todas las visitas al veterinario con tipo de consulta, checklist clínico y notas. Separado por fechas y listo para compartir.',
  },
  {
    icon: '🩺',
    title: 'Registro de síntomas',
    desc: 'Documentá síntomas con severidad y notas. Te ayuda a prepararte para hablar con el veterinario con información precisa y ordenada.',
  },
  {
    icon: '📄',
    title: 'Exportar historial en PDF',
    desc: 'Generá el resumen de salud de tu perro para llevarlo al veterinario. Toda la historia organizada en un documento, siempre lista para compartir.',
  },
];

function Features() {
  return (
    <section className="landing-section" id="funcionalidades">
      <div className="landing-container">
        <span className="landing-eyebrow">Funcionalidades</span>
        <h2 className="landing-section-title">Todo lo que necesitás para cuidar bien a tu perro</h2>
        <p className="landing-section-sub">
          Te ayudamos a organizarte, recordarte lo importante y reducir la ansiedad del día a día.
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
  { n: '2', title: 'Cargá el perfil de tu perro', desc: 'Edad, raza e historial. Si es cachorro, el calendario se arma solo.' },
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

function BrandStory() {
  return (
    <section className="landing-section landing-brand-story-section">
      <div className="landing-container">
        <div className="landing-brand-story-inner">
          <div className="landing-brand-story-paw" aria-hidden="true">🐾</div>
          <span className="landing-eyebrow">Por qué existe Milo Care</span>
          <h2 className="landing-brand-story-title">Nació para cuidar mejor a Milo.</h2>
          <div className="landing-brand-story-text">
            <p>
              Cuando nos mudamos de Uruguay a Argentina, Milo venía de ser socio de una
              veterinaria en Montevideo que ofrecía un programa preventivo completo: vacunas,
              desparasitaciones, controles y recordatorios coordinados. Cruzar el Río de la Plata
              significó perder toda esa continuidad.
            </p>
            <p>
              En Argentina no encontramos ninguna herramienta que nos permitiera llevar su
              historial, saber qué vacunas le correspondían según su edad y el nuevo país, o
              recibir un aviso antes de que venciera algo importante. Todo lo que el programa
              de Uruguay hacía por nosotros, ahora lo teníamos que recordar solos.
            </p>
            <p>
              Milo Care nació de esa necesidad concreta. No para reemplazar al veterinario —
              sino para ser el copiloto que te ayuda a no olvidar nada, a llegar mejor preparado
              a cada consulta, y a darle a tu perro la continuidad que se merece, estés donde estés.
            </p>
          </div>
          <p className="landing-brand-story-sig">— El equipo de Milo Care 🐾</p>
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
              <li className="landing-pricing-no">✗ Exportar historial en PDF</li>
              <li className="landing-pricing-no">✗ Citas con checklist WSAVA</li>
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
              <li>✓ <strong>Exportar historial en PDF</strong></li>
              <li>✓ <strong>Citas con checklist WSAVA</strong></li>
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
        <h2>Empezá hoy, es gratis</h2>
        <p>
          Cargá a tu perro en minutos y tené el control de su salud siempre con vos.
          Sin tarjeta de crédito, sin compromisos.
        </p>
        <Link to="/register" className="landing-btn-white landing-btn-lg">
          Crear cuenta gratuita →
        </Link>
        <p style={{ marginTop: '12px', fontSize: '0.875rem', color: '#bfdbfe' }}>
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
        <div className="landing-brand" style={{ color: '#7dd3fc' }}>
          🐾 <span>Milo Care</span>
        </div>
        <p className="landing-footer-copy">
          © {new Date().getFullYear()} Milo Care. El copiloto de salud preventiva para tu perro.<br/>
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
        <Segments />
        <Problem />
        <Features />
        <HowItWorks />
        <BrandStory />
        <Pricing />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
