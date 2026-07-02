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

function ProblemSolution() {
  const { t } = useI18n();
  const rows = t('landing.problem.rows');
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="problem-title">
      <div className="landing-container">
        <span className="landing-eyebrow">{t('landing.problem.eyebrow')}</span>
        <h2 id="problem-title" className="landing-section-title">{t('landing.problem.title')}</h2>
        <p className="landing-section-sub">{t('landing.problem.sub')}</p>
        <div className="landing-compare">
          <div className="landing-compare-card landing-compare-bad">
            <h3>{t('landing.problem.badTitle')}</h3>
            <ul>{rows.map((r) => <li key={r[0]}><span aria-hidden="true">✕</span> {r[0]}</li>)}</ul>
          </div>
          <div className="landing-compare-card landing-compare-good">
            <h3>{t('landing.problem.goodTitle')}</h3>
            <ul>{rows.map((r) => <li key={r[1]}><span aria-hidden="true">✓</span> {r[1]}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const { t } = useI18n();
  const steps = t('landing.how.steps');
  return (
    <section className="landing-section" id="como-funciona" aria-labelledby="how-title">
      <div className="landing-container">
        <span className="landing-eyebrow">{t('landing.how.eyebrow')}</span>
        <h2 id="how-title" className="landing-section-title">{t('landing.how.title')}</h2>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <div key={i} className="landing-step">
              <div className="landing-step-number">{i + 1}</div>
              {i < steps.length - 1 && <div className="landing-step-connector" />}
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

const FEATURE_ICONS = ['🔔', '💉', '📄', '💊', '📝', '👨‍👩‍👧'];

function Features() {
  const { t } = useI18n();
  const items = t('landing.features.items');
  return (
    <section className="landing-section landing-section-alt" id="funcionalidades" aria-labelledby="features-title">
      <div className="landing-container">
        <span className="landing-eyebrow">{t('landing.features.eyebrow')}</span>
        <h2 id="features-title" className="landing-section-title">{t('landing.features.title')}</h2>
        <p className="landing-section-sub">{t('landing.features.sub')}</p>
        <div className="landing-features-grid landing-features-grid-3">
          {items.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon">{FEATURE_ICONS[i]}</div>
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
  const { t } = useI18n();
  return (
    <section className="landing-section" aria-labelledby="story-title">
      <div className="landing-container landing-story">
        <span className="landing-eyebrow">{t('landing.story.eyebrow')}</span>
        <h2 id="story-title" className="landing-section-title">{t('landing.story.title')}</h2>
        <p>{t('landing.story.p1')}</p>
        <p>{t('landing.story.p2')}</p>
        <p className="landing-story-close">
          {t('landing.story.closeLead')} <strong>{t('landing.story.closeStrong')}</strong>
        </p>
      </div>
    </section>
  );
}

// ── Confianza / prueba social ───────────────────────────────────────────────────
// NOTA: no inventamos testimonios ni cifras de usuarios. Cuando haya material real
// (quotes de tutores beta + respaldo de un veterinario/a), va en `TESTIMONIALS`.
const TESTIMONIALS = []; // [{ quote, name, city, dog }]

const GUARANTEE_ICONS = ['🩺', '🔒', '💛'];

function Trust() {
  const { t } = useI18n();
  const guarantees = t('landing.trust.guarantees');
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="trust-title">
      <div className="landing-container">
        <span className="landing-eyebrow">{t('landing.trust.eyebrow')}</span>
        <h2 id="trust-title" className="landing-section-title">{t('landing.trust.title')}</h2>
        <p className="landing-section-sub">{t('landing.trust.sub')}</p>

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
          {guarantees.map((g, i) => (
            <div key={i} className="landing-guarantee">
              <span className="landing-guarantee-icon" aria-hidden="true">{GUARANTEE_ICONS[i]}</span>
              <div>
                <h3>{g.title}</h3>
                <p>{g.desc}</p>
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

const FAQ_IDS = ['reemplaza-vet', 'paises', 'datos', 'no-se-fecha'];

function FAQ({ variant }) {
  const { t } = useI18n();
  const [openId, setOpenId] = useState(null);
  const items = t('landing.faq.items');

  function toggle(id) {
    const isOpening = openId !== id;
    setOpenId(isOpening ? id : null);
    if (isOpening) track('faq_opened', { question_id: id, headline_variant: variant });
  }

  return (
    <section className="landing-section landing-section-alt" aria-labelledby="faq-title">
      <div className="landing-container">
        <h2 id="faq-title" className="landing-section-title">{t('landing.faq.title')}</h2>
        <div className="landing-faq-list">
          {items.map((item, i) => {
            const id = FAQ_IDS[i];
            const isOpen = openId === id;
            return (
              <div key={id} className="landing-faq-item">
                <button className="landing-faq-question" aria-expanded={isOpen} aria-controls={`faq-answer-${id}`} onClick={() => toggle(id)}>
                  <span>{item.q}</span>
                  <span className="landing-faq-chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                </button>
                <div id={`faq-answer-${id}`} role="region" className={`landing-faq-answer${isOpen ? ' landing-faq-answer--open' : ''}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="landing-novet-note">{t('landing.faq.disclaimer')}</p>
      </div>
    </section>
  );
}

// ── Footer (acá vive el acceso B2B) ─────────────────────────────────────────────

function LandingFooter() {
  const { t } = useI18n();
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
        <p className="landing-footer-copy">{t('landing.footer.copy')}</p>
        <div className="landing-footer-links">
          <a href="#funcionalidades">{t('landing.footer.product')}</a>
          <a href="#planes">{t('landing.footer.pricing')}</a>
          <Link to="/para-veterinarias">{t('landing.footer.vets')}</Link>
          <Link to="/para-partners">{t('landing.footer.companies')}</Link>
          <Link to="/developers">{t('landing.footer.developers')}</Link>
          <a href="/terminos.pdf">{t('landing.footer.terms')}</a>
          <a href="/privacidad.pdf">{t('landing.footer.privacy')}</a>
          <a href={partnerMail('Contacto Milo Care')}>{t('landing.footer.contact')}</a>
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
