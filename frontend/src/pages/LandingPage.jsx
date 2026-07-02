import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useI18n } from '../i18n/I18nProvider';
import '../styles/landing-v2.css';
import '../styles/landing-redesign.css';

// ── A/B variant (solo 2 headlines para testear) ─────────────────────────────────

function getVariant() {
  const stored = sessionStorage.getItem('landing_variant');
  if (stored && ['a', 'b'].includes(stored)) return stored;
  const param = new URLSearchParams(window.location.search).get('v') || 'a';
  const variant = ['a', 'b'].includes(param) ? param : 'a';
  sessionStorage.setItem('landing_variant', variant);
  return variant;
}

// El acceso B2B (veterinarias, empresas, developers) vive en el footer y en sus
// páginas dedicadas — la landing tiene un solo trabajo: el registro del tutor.
const partnerMail = (asunto) => `mailto:hola@milocare.org?subject=${encodeURIComponent(asunto)}`;

// ── Analytics ───────────────────────────────────────────────────────────────────

function track(event, props = {}) {
  if (typeof window.plausible === 'function') {
    window.plausible(event, { props });
  }
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav({ variant }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="landing-nav" aria-label={t('landing.nav.aria')}>
      <div className="landing-nav-inner">
        <div className="landing-brand">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor" opacity=".9" />
          </svg>
          <span>Milo Care</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/para-partners" className="landing-nav-link landing-nav-link-muted">{t('landing.nav.pros')}</Link>
          <Link to="/login" className="landing-nav-link">{t('landing.nav.login')}</Link>
          <LanguageSwitcher source="landing" />
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-sm landing-nav-cta"
            onClick={() => track('cta_signup_click', { position: 'nav', headline_variant: variant })}
          >
            {t('landing.nav.cta')}
          </Link>
          <button
            type="button"
            className="landing-nav-burger"
            aria-label={menuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="landing-nav-mobile" id="landing-mobile-menu">
          <Link to="/para-partners" className="landing-nav-link" onClick={closeMenu}>{t('landing.nav.pros')}</Link>
          <Link to="/login" className="landing-nav-link" onClick={closeMenu}>{t('landing.nav.login')}</Link>
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-full landing-nav-cta"
            onClick={() => {
              track('cta_signup_click', { position: 'nav_mobile', headline_variant: variant });
              closeMenu();
            }}
          >
            {t('landing.nav.cta')}
          </Link>
        </div>
      )}
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

const FLOATING_PAWS = [
  { x: '4%', y: '75%', size: 22, opacity: 0.10, delay: '0s', dur: '7s', rotate: -25 },
  { x: '12%', y: '20%', size: 16, opacity: 0.08, delay: '2.1s', dur: '9s', rotate: 40 },
  { x: '22%', y: '55%', size: 28, opacity: 0.11, delay: '0.8s', dur: '6s', rotate: -10 },
  { x: '48%', y: '15%', size: 20, opacity: 0.09, delay: '1.4s', dur: '7.5s', rotate: -40 },
  { x: '68%', y: '35%', size: 18, opacity: 0.10, delay: '0.3s', dur: '6.5s', rotate: -55 },
  { x: '78%', y: '80%', size: 24, opacity: 0.08, delay: '2.8s', dur: '8s', rotate: 30 },
  { x: '88%', y: '25%', size: 26, opacity: 0.11, delay: '1.0s', dur: '7s', rotate: -20 },
  { x: '93%', y: '60%', size: 15, opacity: 0.07, delay: '5.0s', dur: '10s', rotate: 50 },
];

const PAW_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" fill="currentColor" aria-hidden="true">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" />
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" />
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" />
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" />
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" />
  </svg>
);

function Hero({ variant, onCtaClick }) {
  const { t } = useI18n();
  const headline = t(`landing.hero.headline${variant.toUpperCase()}`);

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

      <div className="landing-container landing-hero-inner">
        <span className="landing-hero-badge">{t('landing.hero.badge')}</span>
        <h1 className="landing-hero-title">{headline}</h1>
        <p className="landing-hero-sub">{t('landing.hero.subhead')}</p>
        <div className="landing-hero-ctas">
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-lg"
            onClick={() => onCtaClick('hero')}
          >
            {t('landing.hero.ctaPrimary')}
          </Link>
          <a href="#como-funciona" className="landing-hero-link">{t('landing.hero.ctaSecondary')}</a>
        </div>
        <p className="landing-hero-footnote">{t('landing.hero.footnote')}</p>
      </div>
    </section>
  );
}

// ── Problema → Solución ─────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  ['Te enterás del vencimiento tarde', 'Te avisa antes, sin configurar nada'],
  ['El historial está en 5 lugares', 'Todo en un solo lugar, siempre a mano'],
  ['Llegás a la consulta sin datos', 'Llegás con el resumen clínico listo'],
  ['Cambiás de país y perdés todo', 'El carnet viaja con tu perro'],
  ['"¿Le tocaba algo este mes?"', 'El calendario lo sabe por vos'],
];

function ProblemSolution() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="problem-title">
      <div className="landing-container">
        <span className="landing-eyebrow">El problema real</span>
        <h2 id="problem-title" className="landing-section-title">
          Cuidar bien a tu perro no debería depender de tu memoria.
        </h2>
        <p className="landing-section-sub">
          La vacuna que toca y nadie recuerda. El tratamiento que se cortó a la mitad. La info repartida
          entre WhatsApp, fotos del carnet y papeles. Milo Care lo ordena por vos y te avisa a tiempo.
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

// ── Cómo funciona ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: '1', t: 'Creá el perfil de tu perro', d: 'Nombre, edad, raza y país. Nada más.' },
  { n: '2', t: 'Recibí su plan de cuidado', d: 'Su calendario de vacunas y controles, armado para él.' },
  { n: '3', t: 'Cargá lo que ya tiene', d: 'Sus vacunas y tratamientos, a tu ritmo.' },
  { n: '4', t: 'Dejá que Milo te avise', d: 'Te recordamos antes de cada vencimiento. Vos solo cuidalo.' },
];

function HowItWorks() {
  return (
    <section className="landing-section" id="como-funciona" aria-labelledby="how-title">
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

// ── Qué hace por vos (features en lenguaje de resultado) ─────────────────────────

const FEATURES = [
  { icon: '🔔', title: 'Nunca más se te pasa una vacuna', desc: 'Te avisamos por email antes de cada vacuna, dosis o control. Sin configurar nada.' },
  { icon: '💉', title: 'Su calendario, armado por su edad y país', desc: 'Sabés qué le toca y cuándo, según guías WSAVA. Sin volverte experta.' },
  { icon: '📄', title: 'El carnet siempre a mano', desc: 'Su historial listo para el vet, la guardería o un viaje, en un toque (PDF / WhatsApp).' },
  { icon: '💊', title: 'Ningún tratamiento a medias', desc: 'Dosis, horarios y fin del tratamiento, siempre bajo control.' },
  { icon: '📝', title: 'Llegás al vet con todo', desc: 'Anotás síntomas y le mostrás el resumen clínico, sin depender de tu memoria.' },
  { icon: '👨‍👩‍👧', title: 'Toda la familia cuida', desc: 'El mismo dato para vos, tu pareja y quien lo cuide. Roles claros.' },
];

function Features() {
  return (
    <section className="landing-section landing-section-alt" id="funcionalidades" aria-labelledby="features-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Todo lo que hace por vos</span>
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
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Historia de marca ─────────────────────────────────────────────────────────

function BrandStory() {
  return (
    <section className="landing-section" aria-labelledby="story-title">
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

// ── Confianza / prueba social ───────────────────────────────────────────────────
// NOTA: no inventamos testimonios ni cifras de usuarios. Cuando haya material real
// (quotes de tutores beta + respaldo de un veterinario/a), va en `TESTIMONIALS`.
const TESTIMONIALS = []; // [{ quote, name, city, dog }]

const GUARANTEES = [
  ['🩺', 'Basada en guías veterinarias', 'Seguimos las guías WSAVA 2022 y las adaptamos a Argentina y Uruguay.'],
  ['🔒', 'Tus datos son tuyos', 'Viajan cifrados y vos controlás con quién se comparten. Siempre.'],
  ['💛', 'Hecha en el Río de la Plata', 'Pensada para vos y tu perro, no un genérico traducido.'],
];

function Trust() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="trust-title">
      <div className="landing-container">
        <span className="landing-eyebrow">En quién confiar</span>
        <h2 id="trust-title" className="landing-section-title">Cuidamos a tu perro con criterio veterinario.</h2>
        <p className="landing-section-sub">
          Estamos en beta con tutores y clínicas reales del Río de la Plata, construyendo la plataforma
          de salud preventiva de la región.
        </p>

        {TESTIMONIALS.length > 0 && (
          <div className="landing-testimonials">
            {TESTIMONIALS.map((tm) => (
              <figure key={tm.name} className="landing-testimonial">
                <blockquote>{tm.quote}</blockquote>
                <figcaption>{tm.name} · {tm.city} {tm.dog && `· con ${tm.dog}`}</figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="landing-guarantees">
          {GUARANTEES.map((g) => (
            <div key={g[1]} className="landing-guarantee">
              <span className="landing-guarantee-icon" aria-hidden="true">{g[0]}</span>
              <div>
                <h3>{g[1]}</h3>
                <p>{g[2]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Planes (solo consumer: Free vs Premium) ─────────────────────────────────────

const PLAN_CONFIG = [
  { id: 'free', to: '/register', featured: false },
  { id: 'premium', to: '/register', featured: true },
];

function Plans() {
  const { t } = useI18n();
  return (
    <section className="landing-section" id="planes" aria-labelledby="plans-title">
      <div className="landing-container">
        <span className="landing-eyebrow">{t('landing.plans.eyebrow')}</span>
        <h2 id="plans-title" className="landing-section-title">{t('landing.plans.title')}</h2>
        <div className="landing-plans-grid landing-plans-grid-2">
          {PLAN_CONFIG.map((p) => {
            const base = `landing.plans.${p.id}`;
            const note = t(`${base}.note`);
            const cta = t(`${base}.cta`);
            const feats = t(`${base}.feats`);
            return (
              <div key={p.id} className={`landing-plan-card${p.featured ? ' landing-plan-featured' : ''}`}>
                {p.featured && <span className="landing-plan-ribbon">{note}</span>}
                <h3 className="landing-plan-name">{t(`${base}.name`)}</h3>
                <div className="landing-plan-price">{t(`${base}.price`)}<span>{t(`${base}.per`)}</span></div>
                {!p.featured && <p className="landing-plan-note">{note}</p>}
                <ul className="landing-plan-feats">
                  {feats.map((f) => <li key={f}><span aria-hidden="true">✓</span> {f}</li>)}
                </ul>
                <Link to={p.to} className={p.featured ? 'landing-btn-primary landing-btn-full' : 'landing-btn-ghost landing-btn-full'}>{cta}</Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA (100% consumer) ───────────────────────────────────────────────────

function FinalCTA({ onCtaClick }) {
  const { t } = useI18n();
  return (
    <section className="landing-cta-section" aria-labelledby="final-cta-title">
      <div className="landing-container landing-cta-inner">
        <h2 id="final-cta-title">{t('landing.finalCta.title')}</h2>
        <p>{t('landing.finalCta.sub')}</p>
        <Link to="/register" className="landing-btn-white landing-btn-lg" onClick={() => onCtaClick('footer')}>
          {t('landing.finalCta.button')}
        </Link>
      </div>
    </section>
  );
}

// ── FAQ (recortado a preguntas del tutor) ───────────────────────────────────────

const FAQ_ITEMS = [
  { id: 'reemplaza-vet', q: '¿Milo Care reemplaza al veterinario?', a: 'No. Milo Care organiza información, recordatorios e historial, y potencia al veterinario. Para diagnósticos, tratamientos o urgencias, siempre consultá con un profesional.' },
  { id: 'paises', q: '¿Funciona en Argentina y Uruguay?', a: 'Sí. Los calendarios están adaptados a cada país y siguen las guías WSAVA. Nacimos en el Río de la Plata.' },
  { id: 'datos', q: '¿Quién ve los datos de mi perro?', a: 'Vos. El dato se comparte con otros solo con tu consentimiento explícito (Ley 25.326 AR / 18.331 UY), y siempre podés revocarlo.' },
  { id: 'no-se-fecha', q: '¿Qué pasa si no sé cuándo fue la última vacuna?', a: 'Cargás lo que tengas y completás el historial de a poco. Milo Care te ayuda a ordenar, no te exige tener todo perfecto desde el día uno.' },
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
        <p className="landing-novet-note">
          🩺 Milo Care es una herramienta de apoyo para cuidar mejor, no para diagnosticar. Ante síntomas
          importantes, urgencias o dudas médicas, consultá siempre con un profesional veterinario.
        </p>
      </div>
    </section>
  );
}

// ── Footer (acá vive el acceso B2B) ─────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-brand landing-footer-brand">
          <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
            <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor" opacity=".9" />
          </svg>
          <span>Milo Care</span>
        </div>
        <p className="landing-footer-copy">© 2026 Milocura · Guías WSAVA 2022 · Hecho en Buenos Aires y Montevideo.</p>
        <div className="landing-footer-links">
          <a href="#funcionalidades">Producto</a>
          <a href="#planes">Precios</a>
          <Link to="/para-veterinarias">Veterinarias</Link>
          <Link to="/para-partners">Empresas</Link>
          <Link to="/developers">Developers</Link>
          <a href="/terminos.pdf">Términos</a>
          <a href="/privacidad.pdf">Privacidad</a>
          <a href={partnerMail('Contacto Milo Care')}>Contacto</a>
        </div>
      </div>
    </footer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [variant] = useState(getVariant);

  useEffect(() => {
    track('landing_view', { headline_variant: variant, referrer: document.referrer || 'direct' });
  }, [variant]);

  function handleCtaClick(position) {
    track('cta_signup_click', { position, headline_variant: variant });
  }

  return (
    <div className="landing-root landing-warm">
      <LandingNav variant={variant} />
      <main>
        <Hero variant={variant} onCtaClick={handleCtaClick} />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <BrandStory />
        <Trust />
        <Plans />
        <FinalCTA onCtaClick={handleCtaClick} />
        <FAQ variant={variant} />
      </main>
      <LandingFooter />
    </div>
  );
}
