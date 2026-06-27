import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PawCursorTrail from '../components/PawCursorTrail';
import { FOUNDER_SLOTS_AVAILABLE } from '../config/founderPlan';
import '../styles/landing-v2.css';

// ── A/B variant ───────────────────────────────────────────────────────────────

function getVariant() {
  const stored = sessionStorage.getItem('landing_variant');
  if (stored && ['a', 'b', 'c'].includes(stored)) return stored;
  const param = new URLSearchParams(window.location.search).get('v') || 'a';
  const variant = ['a', 'b', 'c'].includes(param) ? param : 'a';
  sessionStorage.setItem('landing_variant', variant);
  return variant;
}

const SUBHEAD =
  'Cargás a tu perro una vez y Milo Care arma su calendario de cuidado, te avisa antes de cada vencimiento y guarda su historial listo para compartir. Gratis para empezar.';

const HERO_VARIANTS = {
  a: { headline: 'Todo lo importante de la salud de tu perro, sin que se te escape nada.', subhead: SUBHEAD },
  b: { headline: 'Cuidar a tu perro no debería depender de tu memoria.', subhead: SUBHEAD },
  c: { headline: 'El sistema operativo de la salud preventiva de tu perro.', subhead: SUBHEAD },
};

// mailto de partners con asunto pre-cargado (no hay endpoint de leads B2B todavía).
const partnerMail = (asunto) => `mailto:hola@milocare.org?subject=${encodeURIComponent(asunto)}`;

// ── Analytics ─────────────────────────────────────────────────────────────────

function track(event, props = {}) {
  if (typeof window.plausible === 'function') {
    window.plausible(event, { props });
  }
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav({ variant }) {
  return (
    <nav className="landing-nav" aria-label="Navegación principal">
      <div className="landing-nav-inner">
        <div className="landing-brand">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="#fff" opacity=".9" />
            <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="#fff" opacity=".9" />
            <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="#fff" opacity=".9" />
            <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="#fff" opacity=".9" />
            <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="#fff" opacity=".9" />
          </svg>
          <span>Milo Care</span>
        </div>
        <div className="landing-nav-actions">
          <a href="#para-quien" className="landing-nav-link">Para empresas</a>
          <Link to="/login" className="landing-nav-link">Iniciar sesión</Link>
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-sm"
            onClick={() => track('cta_signup_click', { position: 'nav', headline_variant: variant })}
          >
            Empezar gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

const FLOATING_PAWS = [
  { x: '4%', y: '75%', size: 22, opacity: 0.12, delay: '0s', dur: '7s', rotate: -25 },
  { x: '12%', y: '20%', size: 16, opacity: 0.09, delay: '2.1s', dur: '9s', rotate: 40 },
  { x: '22%', y: '55%', size: 28, opacity: 0.14, delay: '0.8s', dur: '6s', rotate: -10 },
  { x: '35%', y: '85%', size: 14, opacity: 0.08, delay: '3.5s', dur: '8s', rotate: 60 },
  { x: '48%', y: '15%', size: 20, opacity: 0.11, delay: '1.4s', dur: '7.5s', rotate: -40 },
  { x: '58%', y: '70%', size: 32, opacity: 0.10, delay: '4.2s', dur: '9.5s', rotate: 15 },
  { x: '68%', y: '35%', size: 18, opacity: 0.13, delay: '0.3s', dur: '6.5s', rotate: -55 },
  { x: '78%', y: '80%', size: 24, opacity: 0.09, delay: '2.8s', dur: '8s', rotate: 30 },
  { x: '88%', y: '25%', size: 26, opacity: 0.15, delay: '1.0s', dur: '7s', rotate: -20 },
  { x: '93%', y: '60%', size: 15, opacity: 0.08, delay: '5.0s', dur: '10s', rotate: 50 },
  { x: '42%', y: '45%', size: 12, opacity: 0.07, delay: '3.0s', dur: '8.5s', rotate: -35 },
  { x: '74%', y: '10%', size: 20, opacity: 0.10, delay: '1.7s', dur: '6s', rotate: 20 },
];

const PAW_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" fill="white" aria-hidden="true">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" />
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" />
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" />
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" />
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" />
  </svg>
);

function Hero({ variant, onCtaClick }) {
  const { headline, subhead } = HERO_VARIANTS[variant];

  return (
    <section className="landing-hero">
      <div aria-hidden="true" className="landing-hero-paws-bg">
        {FLOATING_PAWS.map((p, i) => (
          <span
            key={i}
            className="landing-hero-paw-float"
            style={{
              left: p.x, top: p.y, width: p.size, height: p.size, opacity: p.opacity,
              '--delay': p.delay, '--dur': p.dur, '--rotate': `${p.rotate}deg`,
            }}
          >
            {PAW_SVG}
          </span>
        ))}
      </div>

      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <span className="landing-hero-badge">🇦🇷 🇺🇾 Nacida en el Río de la Plata · Plataforma tech, API-first</span>
        <h1 className="landing-hero-title">{headline}</h1>
        <p className="landing-hero-sub">{subhead}</p>
        <div className="landing-hero-ctas">
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-lg"
            onClick={() => onCtaClick('hero')}
          >
            Empezar gratis →
          </Link>
          <a href="#para-quien" className="landing-btn-ghost landing-btn-lg landing-hero-ghost">
            Para veterinarias y partners
          </a>
        </div>
        <p className="landing-hero-footnote">Sin tarjeta de crédito · El plan gratuito incluye 1 perro · Argentina y Uruguay</p>
      </div>
    </section>
  );
}

// ── Trust bar ─────────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  'Guías WSAVA 2022',
  'SENASA (AR) + MGAP (UY)',
  'Recordatorios automáticos',
  'Datos cifrados (Ley 25.326 / 18.331)',
  'Vos controlás tu dato',
];

function TrustBar() {
  return (
    <div className="landing-trustbar" aria-label="Sellos de confianza">
      <ul className="landing-trustbar-list">
        {TRUST_ITEMS.map((t) => (
          <li key={t} className="landing-trustbar-item"><span aria-hidden="true">✓</span> {t}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  ['Te enterás del vencimiento tarde', 'Te avisa antes, sin configurar nada'],
  ['El historial está en 5 lugares', 'Todo en un solo lugar, siempre a mano'],
  ['Llegás a la consulta sin datos', 'Llegás con el resumen clínico listo'],
  ['Cambiás de país y perdés todo', 'El carnet viaja con tu perro'],
  ['"¿Le tocaba algo este mes?"', 'El calendario lo sabe por vos'],
];

function Problem() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="problem-title">
      <div className="landing-container">
        <span className="landing-eyebrow">El problema real</span>
        <h2 id="problem-title" className="landing-section-title">
          Cuidar bien a un perro es un montón de datos sueltos que nadie ordena.
        </h2>
        <p className="landing-section-sub">
          La vacuna que toca y nadie recuerda. El tratamiento que se cortó a la mitad. La consulta
          donde no te acordás qué dijo el veterinario. La info de tu perro vive repartida entre
          WhatsApp, fotos del carnet, papeles y memoria. Y cuando viajás o cambiás de país, empezás de cero.
        </p>
        <div className="landing-compare">
          <div className="landing-compare-card landing-compare-bad">
            <h3>Sin Milo Care</h3>
            <ul>{COMPARE_ROWS.map((r) => <li key={r[0]}><span aria-hidden="true">✕</span> {r[0]}</li>)}</ul>
          </div>
          <div className="landing-compare-card landing-compare-good">
            <h3>Con Milo Care</h3>
            <ul>{COMPARE_ROWS.map((r) => <li key={r[1]}><span aria-hidden="true">✓</span> {r[1]}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Ecosystem (sección bisagra) ───────────────────────────────────────────────

const ECOSYSTEM_ACTORS = ['🐶 Tutor', '🏥 Veterinaria', '🛍️ Pet shop', '🦴 Guardería', '🛡️ Seguro', '🏠 Refugio'];

function Ecosystem() {
  return (
    <section className="landing-section landing-ecosystem" aria-labelledby="eco-title">
      <div className="landing-container">
        <span className="landing-eyebrow">No es una app. Es una plataforma.</span>
        <h2 id="eco-title" className="landing-section-title">
          La salud de tu perro toca a muchos. Hoy no se hablan entre sí.
        </h2>
        <p className="landing-section-sub">
          El veterinario, la guardería, el pet shop, el seguro, el refugio. Cada uno tiene una pieza
          del cuidado de tu perro, pero esas piezas nunca se juntan. Milo Care es la columna vertebral
          que las conecta — con tu dato, bajo tu consentimiento, siempre.
        </p>
        <div className="landing-ecosystem-map" aria-hidden="true">
          <div className="landing-ecosystem-hub">🐾<br />Milo Care</div>
          <div className="landing-ecosystem-actors">
            {ECOSYSTEM_ACTORS.map((a) => <span key={a} className="landing-ecosystem-chip">{a}</span>)}
          </div>
        </div>
        <p className="landing-ecosystem-note">
          🔒 Tu privacidad no es la letra chica: es el diseño. Cada actor recibe solo lo que autorizás,
          y te devuelve valor. <strong>Vos en el centro, el dato bajo tu control.</strong>
        </p>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🧭', title: 'Onboarding inteligente', desc: 'Cargás edad, raza, país y estado sanitario; te armamos el plan y el calendario en 90 segundos.', tag: 'NUEVO' },
  { icon: '💉', title: 'Calendario vacunal personalizado', desc: 'Adaptado a edad, raza y país. Separa lo aplicado de lo sugerido (WSAVA / SENASA / MGAP).' },
  { icon: '🔔', title: 'Recordatorios automáticos', desc: 'Te avisamos por email antes de cada vacuna, dosis o cita. Sin configurar nada.' },
  { icon: '💊', title: 'Control de medicamentos', desc: 'Dosis, frecuencia, fin del tratamiento y estado activo o completado.' },
  { icon: '🩺', title: 'Historial de consultas', desc: 'Visitas organizadas con tipo, checklist clínico WSAVA y notas.' },
  { icon: '📝', title: 'Registro de síntomas', desc: 'Bitácora con fecha y severidad, lista para mostrarle al veterinario.' },
  { icon: '📄', title: 'Carnet portable en PDF / WhatsApp', desc: 'Resumen clínico para viaje, guardería o cambio de país. Listo en un toque.', tag: 'NUEVO' },
  { icon: '👨‍👩‍👧', title: 'Multi-mascota y multi-tutor', desc: 'Toda la familia ve y cuida con el mismo dato y roles claros.', tag: 'NUEVO' },
  { icon: '🔄', title: 'Historial portable e interoperable', desc: 'La columna vertebral que conecta a tu perro con todo el ecosistema.' },
];

function Features() {
  return (
    <section className="landing-section" id="funcionalidades" aria-labelledby="features-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Todo lo que hace</span>
        <h2 id="features-title" className="landing-section-title">
          Una sola app para todo el cuidado preventivo.
        </h2>
        <p className="landing-section-sub">
          Desde el primer día tenés el plan armado, los recordatorios andando y el historial creciendo
          solo. Vos cuidás; del orden nos encargamos nosotros.
        </p>
        <div className="landing-features-grid landing-features-grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">{f.icon}</div>
              <h3>{f.title} {f.tag && <span className="landing-feature-tag">{f.tag}</span>}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: '1', t: 'Creá el perfil de tu perro', d: 'Nombre, edad, raza y país. Nada más.' },
  { n: '2', t: 'Recibí su plan de cuidado', d: 'Calendario de vacunas y controles armado para él.' },
  { n: '3', t: 'Cargá lo que ya tiene', d: 'Sus vacunas y tratamientos, a tu ritmo.' },
  { n: '4', t: 'Dejá que te avise', d: 'Te recordamos antes de cada vencimiento. Vos solo cuidás.' },
];

function HowItWorks() {
  return (
    <section className="landing-section landing-section-alt" id="como-funciona" aria-labelledby="how-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Cómo funciona</span>
        <h2 id="how-title" className="landing-section-title">Empezás en 90 segundos.</h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-number">{s.n}</div>
              {i < STEPS.length - 1 && <div className="landing-step-connector" />}
              <div className="landing-step-content">
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Para quién (ecosistema · actores) ─────────────────────────────────────────

const ACTORS = [
  { icon: '🐶', title: 'Tutores', claim: 'Cuidá bien sin volverte experto.', body: 'Cero olvidos, el historial siempre a mano y menos ansiedad.', cta: 'Crear cuenta gratis →', to: '/register' },
  { icon: '🏥', title: 'Veterinarias y clínicas', claim: 'Tus pacientes llegan con el historial al día.', body: 'Mejor seguimiento entre consultas y un programa de referidos con materiales para tu sala de espera.', cta: 'Ser clínica piloto →', mail: 'Quiero sumar mi clínica a Milo Care' },
  { icon: '🛍️', title: 'Pet shops y partners', claim: 'La puerta de entrada al tutor que ya te elige.', body: 'Fidelización, recurrencia y co-marketing con la marca que el dueño abre todas las semanas.', cta: 'Quiero ser partner →', mail: 'Quiero ser partner de canal de Milo Care' },
  { icon: '🦴', title: 'Guarderías y paseadores', claim: 'Recibí al perro con instrucciones y datos claros.', body: 'Cuidado más seguro, responsabilidad cubierta y un servicio que se diferencia.', cta: 'Sumar mi servicio →', mail: 'Quiero sumar mi guardería/servicio a Milo Care' },
  { icon: '🛡️', title: 'Aseguradoras', claim: 'Historial confiable = mejor prevención y pricing.', body: 'Datos longitudinales, menos siniestros evitables y onboarding de asegurados más simple.', cta: 'Hablar de integración →', mail: 'Integración de seguros con Milo Care' },
  { icon: '🏠', title: 'Refugios y criadores', claim: 'Continuidad del cuidado desde el día uno.', body: 'Adopciones y entregas con historial completo y portable que viaja con el perro.', cta: 'Sumar mi organización →', mail: 'Quiero sumar mi refugio/criadero a Milo Care' },
];

function ForWhom() {
  return (
    <section className="landing-section" id="para-quien" aria-labelledby="forwhom-title">
      <div className="landing-container">
        <span className="landing-eyebrow">El ecosistema</span>
        <h2 id="forwhom-title" className="landing-section-title">Milo Care suma a todos los que cuidan.</h2>
        <p className="landing-section-sub">
          Cada actor tiene su dolor y su beneficio. El dato del tutor fluye hacia los demás con su
          consentimiento, y cada uno le devuelve valor.
        </p>
        <div className="landing-actors-grid">
          {ACTORS.map((a) => (
            <div key={a.title} className="landing-actor-card">
              <div className="landing-feature-icon" aria-hidden="true">{a.icon}</div>
              <h3>{a.title}</h3>
              <p className="landing-actor-claim">{a.claim}</p>
              <p className="landing-actor-body">{a.body}</p>
              {a.to ? (
                <Link to={a.to} className="landing-actor-cta">{a.cta}</Link>
              ) : (
                <a href={partnerMail(a.mail)} className="landing-actor-cta">{a.cta}</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Por qué es distinta ───────────────────────────────────────────────────────

const WHY = [
  ['🎯', 'Para el dueño primerizo, no para el experto.', 'Te guía sin asumir que sabés de medicina veterinaria.'],
  ['🌎', 'Rioplatense de verdad.', 'Calendarios según SENASA y MGAP, no un genérico traducido.'],
  ['🤝', 'El veterinario es aliado, no competencia.', 'Lo potenciamos con mejor información; no lo reemplazamos.'],
  ['🧩', 'Plataforma, no app de nicho.', 'API-first: infraestructura de salud e identidad de mascotas para todo el ecosistema.'],
  ['💛', 'Emocional, no clínica.', 'Se siente como abrir el álbum de tu perro, no como llenar una ficha.'],
];

function WhyDifferent() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="why-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Por qué Milo Care</span>
        <h2 id="why-title" className="landing-section-title">No es otra app de mascotas. Es la que pensaron para vos.</h2>
        <div className="landing-why-grid">
          {WHY.map((w) => (
            <div key={w[1]} className="landing-why-item">
              <span className="landing-why-icon" aria-hidden="true">{w[0]}</span>
              <div>
                <h3>{w[1]}</h3>
                <p>{w[2]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Platform / API-first (para empresas) ──────────────────────────────────────

const PLATFORM_CARDS = [
  { icon: '🧩', title: 'API REST + Webhooks', body: 'Integrá la salud, el calendario de cuidado y el Pet Score de las mascotas con tu producto. Documentación abierta y eventos en tiempo real.' },
  { icon: '🏷️', title: 'White-label', body: 'Entregá Milo Care con tu marca a tus clientes — branding por slug, sin desarrollar nada desde cero.' },
  { icon: '🔒', title: 'Datos consentidos, nunca clínicos', body: 'Solo métricas agregadas y certificados de confianza con consentimiento explícito del tutor. Nunca historia clínica individual.' },
];

function Platform() {
  return (
    <section className="landing-section" aria-labelledby="platform-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Para empresas · API-first</span>
        <h2 id="platform-title" className="landing-section-title">
          Milo Care también es una capa tecnológica para integrar.
        </h2>
        <p className="landing-section-sub">
          Aseguradoras, fintechs, bancos y veterinarias conectan Milo Care como su capa de salud e
          identidad de mascotas: el Pet Score, el carnet y el calendario de cuidado, listos para
          enchufar a tu producto vía API y webhooks.
        </p>
        <div className="landing-benefits-grid">
          {PLATFORM_CARDS.map((c) => (
            <div key={c.title} className="landing-benefit-card">
              <div className="landing-feature-icon" aria-hidden="true">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <Link to="/developers" className="landing-btn-primary landing-btn-lg">
            Ver la documentación de la API →
          </Link>
          <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--color-muted, #64748b)' }}>
            ¿Querés integrar? Escribinos a{' '}
            <a href={partnerMail('Integración API Milo Care')} style={{ fontWeight: 600 }}>hola@milocare.org</a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Historia de marca ─────────────────────────────────────────────────────────

function BrandStory() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="story-title">
      <div className="landing-container landing-story">
        <span className="landing-eyebrow">Nuestra historia</span>
        <h2 id="story-title" className="landing-section-title">Milo Care nació de una mudanza.</h2>
        <p>
          En Montevideo, Milo tenía todo en orden: su veterinaria coordinaba las vacunas, las
          desparasitaciones, los controles y los recordatorios. Era fácil cuidarlo bien porque alguien
          llevaba el hilo.
        </p>
        <p>
          Cuando nos mudamos a Argentina, ese hilo se cortó. No había forma de llevarnos su historial,
          de saber qué le correspondía según su edad y el nuevo país, ni de que algo nos avisara antes
          de que venciera. Empezamos de cero, a pura memoria.
        </p>
        <p className="landing-story-close">
          Milo Care es lo que necesitábamos ese día y no existía: <strong>la continuidad del cuidado,
          en cualquier lugar, para que ningún perro dependa de que te acuerdes de todo.</strong>
        </p>
      </div>
    </section>
  );
}

// ── Planes ────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Free', price: '$0', note: 'Para empezar hoy',
    feats: ['1 perro', 'Calendario de vacunas personalizado', 'Recordatorios automáticos', 'Carnet básico'],
    cta: 'Empezar gratis →', to: '/register', featured: false,
  },
  {
    name: 'Premium', price: 'USD 4,99', per: '/mes', note: 'Más elegido',
    feats: ['Perros ilimitados', 'Carnet e historial en PDF / WhatsApp', 'Checklist clínico WSAVA', 'Multi-tutor y roles familiares', 'Soporte prioritario'],
    cta: 'Probar Premium →', to: '/register', featured: true,
  },
  {
    name: 'Clínicas y aliados', price: 'A medida', note: 'B2B / partners',
    feats: ['White-label y referidos', 'Integraciones y API', 'Para vets, pet shops, seguros y partners'],
    cta: 'Hablemos →', mail: 'Plan para clínicas y aliados — Milo Care', featured: false,
  },
];

function Plans() {
  return (
    <section className="landing-section" id="planes" aria-labelledby="plans-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Planes</span>
        <h2 id="plans-title" className="landing-section-title">Empezá gratis. Crecé cuando lo necesites.</h2>
        <div className="landing-plans-grid">
          {PLANS.map((p) => (
            <div key={p.name} className={`landing-plan-card${p.featured ? ' landing-plan-featured' : ''}`}>
              {p.featured && <span className="landing-plan-ribbon">{p.note}</span>}
              <h3 className="landing-plan-name">{p.name}</h3>
              <div className="landing-plan-price">{p.price}<span>{p.per || ''}</span></div>
              {!p.featured && <p className="landing-plan-note">{p.note}</p>}
              <ul className="landing-plan-feats">
                {p.feats.map((f) => <li key={f}><span aria-hidden="true">✓</span> {f}</li>)}
              </ul>
              {p.to ? (
                <Link to={p.to} className={p.featured ? 'landing-btn-primary landing-btn-full' : 'landing-btn-ghost landing-btn-full'}>{p.cta}</Link>
              ) : (
                <a href={partnerMail(p.mail)} className="landing-btn-ghost landing-btn-full">{p.cta}</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Signup form (waitlist / beta) ─────────────────────────────────────────────

function SignupForm({ variant, formRef }) {
  const [email, setEmail] = useState('');
  const [dogName, setDogName] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre_cachorro: dogName || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al registrar.');
      }
      track('signup_submitted', { headline_variant: variant, has_dog_name: dogName.trim().length > 0 });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Algo salió mal. Intentá de nuevo.');
    }
  }

  if (status === 'success') {
    return (
      <p className="landing-signup-success" role="status">
        ¡Listo! Te anotamos. Te vamos a escribir con las novedades de Milo Care.
      </p>
    );
  }

  return (
    <form ref={formRef} className="landing-signup-form" onSubmit={handleSubmit} noValidate aria-label="Formulario para sumarte">
      <div className="landing-signup-fields">
        <div className="landing-signup-field">
          <label htmlFor="signup-email" className="landing-signup-label">Tu email</label>
          <input id="signup-email" type="email" className="landing-signup-input" placeholder="vos@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="landing-signup-field">
          <label htmlFor="signup-dog-name" className="landing-signup-label">
            ¿Cómo se llama tu perro? <span className="landing-signup-optional">(opcional)</span>
          </label>
          <input id="signup-dog-name" type="text" className="landing-signup-input" placeholder="Milo, Luna, Thor..." value={dogName} onChange={(e) => setDogName(e.target.value)} autoComplete="off" />
        </div>
      </div>
      {status === 'error' && <p className="landing-signup-error" role="alert">{errorMsg}</p>}
      <button type="submit" className="landing-btn-primary landing-btn-lg landing-signup-submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Enviando...' : 'Quiero probar Milo Care'}
      </button>
      <p className="landing-hero-footnote" style={{ textAlign: 'center' }}>
        Sin tarjeta de crédito · Empezás en minutos.
      </p>
    </form>
  );
}

// ── Founder modal ─────────────────────────────────────────────────────────────

function FounderModal({ onClose, variant }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/founder-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al registrar.');
      }
      track('founder_payment_initiated', { headline_variant: variant });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Algo salió mal. Intentá de nuevo.');
    }
  }

  return (
    <div className="landing-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="landing-modal">
        <button className="landing-modal-close" aria-label="Cerrar" onClick={onClose}>×</button>
        {status === 'success' ? (
          <div className="landing-modal-success" role="status">
            <div style={{ fontSize: '2.5rem' }} aria-hidden="true">🎉</div>
            <h3>¡Reserva recibida!</h3>
            <p>Te contactamos en las próximas 24 horas con los detalles del acceso. Gracias por creer en Milo Care desde el principio.</p>
          </div>
        ) : (
          <>
            <h3 id="modal-title" className="landing-modal-title">Acceso anticipado · Founder Plan</h3>
            <p className="landing-modal-sub">US$25/año vitalicio · sin aumentos · quedan {FOUNDER_SLOTS_AVAILABLE} cupos</p>
            <form onSubmit={handleSubmit} noValidate aria-label="Formulario Founder Plan">
              <div className="landing-signup-field" style={{ marginBottom: '12px' }}>
                <label htmlFor="founder-email" className="landing-signup-label">Tu email</label>
                <input id="founder-email" ref={firstFieldRef} type="email" className="landing-signup-input" placeholder="vos@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="landing-signup-field" style={{ marginBottom: '16px' }}>
                <label htmlFor="founder-name" className="landing-signup-label">Tu nombre <span className="landing-signup-optional">(opcional)</span></label>
                <input id="founder-name" type="text" className="landing-signup-input" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              {status === 'error' && <p className="landing-signup-error" role="alert">{errorMsg}</p>}
              <button type="submit" className="landing-btn-primary landing-btn-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Enviando...' : 'Reservar mi lugar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Beta / Founder ────────────────────────────────────────────────────────────

function BetaSection({ variant, formRef }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleFounderClick() {
    track('cta_founder_click', { headline_variant: variant });
    setModalOpen(true);
  }

  return (
    <>
      <section className="landing-section landing-beta-section" aria-labelledby="beta-title">
        <div className="landing-container">
          <div className="landing-beta-inner">
            <span className="landing-eyebrow landing-eyebrow-light">Acceso anticipado</span>
            <h2 id="beta-title" className="landing-beta-title">
              Entre los primeros 1.000 dueños del Río de la Plata.
            </h2>
            <p className="landing-beta-body">
              Estamos lanzando con tutores y clínicas reales. Sumate ahora y ayudanos a construir la
              plataforma de salud preventiva de las mascotas de la región.
            </p>
            <SignupForm variant={variant} formRef={formRef} />
            <div className="landing-beta-divider"><span>¿Querés ir un paso más?</span></div>
            <div className="landing-beta-founder">
              <p className="landing-beta-founder-text">
                El <strong>Founder Plan</strong> te da acceso vitalicio a Premium por US$25/año —
                un pago único, sin aumentos. Quedan {FOUNDER_SLOTS_AVAILABLE} cupos.
              </p>
              <button className="landing-beta-founder-btn" onClick={handleFounderClick}>Conocer el Founder Plan →</button>
              <p className="landing-founder-guarantee">Si no te enamorás en 30 días, te devolvemos el dinero sin preguntas.</p>
            </div>
          </div>
        </div>
      </section>
      {modalOpen && <FounderModal variant={variant} onClose={() => setModalOpen(false)} />}
    </>
  );
}

// ── No-vet disclaimer ─────────────────────────────────────────────────────────

function NoVet() {
  return (
    <section className="landing-section landing-novet-section" aria-labelledby="novet-title">
      <div className="landing-container">
        <div className="landing-novet-box">
          <div className="landing-novet-icon" aria-hidden="true">🩺</div>
          <h2 id="novet-title" className="landing-novet-title">Una herramienta para cuidar mejor, no para diagnosticar.</h2>
          <p className="landing-novet-body">
            Milo Care orienta y ordena: sugiere qué observar y cuándo consultar, y prepara el resumen
            para tu veterinario. No reemplaza la mirada profesional.
          </p>
          <p className="landing-novet-micro">
            Ante síntomas importantes, urgencias o dudas médicas, siempre consultá con un profesional veterinario.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  { id: 'reemplaza-vet', q: '¿Milo Care reemplaza al veterinario?', a: 'No. Milo Care organiza información, recordatorios e historial, y potencia al veterinario. Para diagnósticos, tratamientos o urgencias, siempre consultá con un profesional.' },
  { id: 'plataforma', q: '¿Es una app o una plataforma?', a: 'Las dos cosas. Para el tutor es una app simple; por debajo es una plataforma API-first que conecta veterinarias, pet shops, seguros y más, siempre con el consentimiento del dueño.' },
  { id: 'paises', q: '¿Funciona en Argentina y Uruguay?', a: 'Sí. Los calendarios siguen SENASA (AR) y MGAP (UY), además de las guías WSAVA. Nacimos en el Río de la Plata y desde ahí expandimos.' },
  { id: 'datos', q: '¿Quién ve los datos de mi perro?', a: 'Vos. El dato fluye hacia otros actores solo con tu consentimiento explícito (Ley 25.326 AR / 18.331 UY), y siempre podés revocarlo.' },
  { id: 'no-se-fecha', q: '¿Qué pasa si no sé cuándo fue la última vacuna?', a: 'Cargás lo que tengas y completás el historial de a poco. Milo Care está pensado para ayudarte a ordenar, no para exigirte tener todo perfecto desde el día uno.' },
];

function FAQ({ variant }) {
  const [openId, setOpenId] = useState(null);

  function toggle(id) {
    const isOpening = openId !== id;
    setOpenId(isOpening ? id : null);
    if (isOpening) track('faq_opened', { question_id: id, headline_variant: variant });
  }

  return (
    <section className="landing-section landing-section-alt" aria-labelledby="faq-title">
      <div className="landing-container">
        <h2 id="faq-title" className="landing-section-title">Preguntas frecuentes</h2>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="landing-faq-item">
                <button className="landing-faq-question" aria-expanded={isOpen} aria-controls={`faq-answer-${item.id}`} onClick={() => toggle(item.id)}>
                  <span>{item.q}</span>
                  <span className="landing-faq-chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                <div id={`faq-answer-${item.id}`} role="region" className={`landing-faq-answer${isOpen ? ' landing-faq-answer--open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA (doble vía) ─────────────────────────────────────────────────────

function FinalCTA({ onCtaClick }) {
  return (
    <section className="landing-cta-section" aria-labelledby="final-cta-title">
      <div className="landing-container landing-cta-inner">
        <h2 id="final-cta-title">Cuidar mejor empieza por tener todo en orden.</h2>
        <p>Creá el perfil de tu perro en 90 segundos. Gratis, sin tarjeta.</p>
        <Link to="/register" className="landing-btn-white landing-btn-lg" onClick={() => onCtaClick('footer')}>
          Empezar gratis →
        </Link>
        <p style={{ marginTop: '14px', fontSize: '0.95rem', color: '#dbeafe' }}>
          ¿Sos veterinaria, pet shop, aseguradora o partner?{' '}
          <a href={partnerMail('Construyamos el ecosistema Milo Care')} style={{ color: '#fff', fontWeight: 700 }}>
            Construyamos el ecosistema juntos →
          </a>
        </p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-brand" style={{ color: '#7dd3fc' }}>
          <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="#7dd3fc" opacity=".9" />
            <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="#7dd3fc" opacity=".9" />
            <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="#7dd3fc" opacity=".9" />
            <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="#7dd3fc" opacity=".9" />
            <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="#7dd3fc" opacity=".9" />
          </svg>
          <span>Milo Care</span>
        </div>
        <p className="landing-footer-copy">© 2026 Milocura · WSAVA 2022 · SENASA (AR) · MGAP (UY) · Hecho en Buenos Aires y Montevideo.</p>
        <div className="landing-footer-links">
          <a href="#funcionalidades">Producto</a>
          <a href="#para-quien">Para clínicas y partners</a>
          <Link to="/developers">Developers</Link>
          <a href="#planes">Precios</a>
          <a href="/terminos.pdf">Términos</a>
          <a href="/privacidad.pdf">Privacidad</a>
          <a href="mailto:hola@milocare.org">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [variant] = useState(getVariant);
  const signupFormRef = useRef(null);

  useEffect(() => {
    track('landing_view', { headline_variant: variant, referrer: document.referrer || 'direct' });
  }, [variant]);

  function handleCtaClick(position) {
    track('cta_signup_click', { position, headline_variant: variant });
  }

  return (
    <div className="landing-root">
      <PawCursorTrail />
      <LandingNav variant={variant} />
      <main>
        <Hero variant={variant} onCtaClick={handleCtaClick} />
        <TrustBar />
        <Problem />
        <Ecosystem />
        <Features />
        <HowItWorks />
        <ForWhom />
        <WhyDifferent />
        <Platform />
        <BrandStory />
        <Plans />
        <BetaSection variant={variant} formRef={signupFormRef} />
        <NoVet />
        <FinalCTA onCtaClick={handleCtaClick} />
        <FAQ variant={variant} />
      </main>
      <LandingFooter />
    </div>
  );
}
