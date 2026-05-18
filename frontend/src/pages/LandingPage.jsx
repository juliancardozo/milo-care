import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PawCursorTrail from '../components/PawCursorTrail';
import { FOUNDER_SLOTS_AVAILABLE } from '../config/founderPlan';

// ── A/B variant ───────────────────────────────────────────────────────────────

function getVariant() {
  const stored = sessionStorage.getItem('landing_variant');
  if (stored && ['a', 'b', 'c'].includes(stored)) return stored;
  const param = new URLSearchParams(window.location.search).get('v') || 'a';
  const variant = ['a', 'b', 'c'].includes(param) ? param : 'a';
  sessionStorage.setItem('landing_variant', variant);
  return variant;
}

const HERO_VARIANTS = {
  a: {
    headline: (
      <>
        Acaba de llegar tu cachorro.<br />
        Y nadie te avisó que en su primer año vienen 14 fechas que no podés olvidar.
      </>
    ),
    subhead:
      'Milo Care arma el calendario de vacunas, desparasitaciones y controles de tu cachorro. Te avisa antes de cada uno. Lo compartís con tu veterinario en un toque. Empezá gratis.',
  },
  b: {
    headline: (
      <>
        Tu cachorro está sano. Que tu cabeza también lo esté.
      </>
    ),
    subhead:
      'La agenda de salud de tu perro, sin libretas mojadas ni "creo que era el martes".',
  },
  c: {
    headline: (
      <>
        Las 14 fechas médicas que tu cachorro necesita en su primer año, en una agenda que te avisa.
      </>
    ),
    subhead:
      'Vacunas, desparasitaciones, refuerzos y controles, ordenados según el calendario de Argentina y Uruguay.',
  },
};

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
          <Link to="/login" className="landing-nav-link">Iniciar sesión</Link>
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-sm"
            onClick={() => track('cta_signup_click', { position: 'nav', headline_variant: variant })}
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

const FLOATING_PAWS = [
  { x: '4%',  y: '75%', size: 22, opacity: 0.12, delay: '0s',    dur: '7s',   rotate: -25 },
  { x: '12%', y: '20%', size: 16, opacity: 0.09, delay: '2.1s',  dur: '9s',   rotate:  40 },
  { x: '22%', y: '55%', size: 28, opacity: 0.14, delay: '0.8s',  dur: '6s',   rotate: -10 },
  { x: '35%', y: '85%', size: 14, opacity: 0.08, delay: '3.5s',  dur: '8s',   rotate:  60 },
  { x: '48%', y: '15%', size: 20, opacity: 0.11, delay: '1.4s',  dur: '7.5s', rotate: -40 },
  { x: '58%', y: '70%', size: 32, opacity: 0.10, delay: '4.2s',  dur: '9.5s', rotate:  15 },
  { x: '68%', y: '35%', size: 18, opacity: 0.13, delay: '0.3s',  dur: '6.5s', rotate: -55 },
  { x: '78%', y: '80%', size: 24, opacity: 0.09, delay: '2.8s',  dur: '8s',   rotate:  30 },
  { x: '88%', y: '25%', size: 26, opacity: 0.15, delay: '1.0s',  dur: '7s',   rotate: -20 },
  { x: '93%', y: '60%', size: 15, opacity: 0.08, delay: '5.0s',  dur: '10s',  rotate:  50 },
  { x: '42%', y: '45%', size: 12, opacity: 0.07, delay: '3.0s',  dur: '8.5s', rotate: -35 },
  { x: '74%', y: '10%', size: 20, opacity: 0.10, delay: '1.7s',  dur: '6s',   rotate:  20 },
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

function Hero({ variant, onCtaClick, signupFormRef }) {
  const { headline, subhead } = HERO_VARIANTS[variant];

  function handleCta(e) {
    e.preventDefault();
    onCtaClick('hero');
    signupFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

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
            {PAW_SVG}
          </span>
        ))}
      </div>

      <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="landing-hero-title">{headline}</h1>
        <p className="landing-hero-sub">{subhead}</p>
        <div className="landing-hero-ctas">
          <button className="landing-btn-primary landing-btn-lg" onClick={handleCta}>
            Armá el calendario de tu cachorro · es gratis
          </button>
        </div>
        <p className="landing-hero-footnote">90 segundos. Sin tarjeta. En español rioplatense.</p>
      </div>
    </section>
  );
}

// ── Problem resonance ─────────────────────────────────────────────────────────

const PROBLEM_CARDS = [
  {
    id: 'papelito',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'El papelito en la guantera.',
    body: 'El vet te entrega la libreta sanitaria. Hoy está perfecta. En tres meses, está abajo del asiento o se mojó cuando bañaste al perro.',
  },
  {
    id: 'sesenta-o-setenta',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: '"¿Era a los 60 o a los 75 días?"',
    body: 'Sabés que toca la segunda vacuna pronto. No sabés exactamente cuándo. Buscás en Google, leés cinco respuestas distintas, llamás al vet, te dice "esta semana o la próxima". Decidís a ojo.',
  },
  {
    id: 'desparasitacion',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="10" y1="14" x2="14" y2="18" />
        <line x1="14" y1="14" x2="10" y2="18" />
      </svg>
    ),
    title: 'La desparasitación que se escapó.',
    body: 'Era mensual. Pasaron 45 días. Te das cuenta cuando le ves algo raro en la caca. Otra vez.',
  },
  {
    id: 'consulta-ciegas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: 'La consulta a ciegas.',
    body: 'Llegás al veterinario y el primer minuto es reconstruir: "le di una pastilla creo que el miércoles", "se rascaba desde el fin de semana", "lo de las orejas ya pasó otra vez". Empezás la consulta perdiendo tiempo.',
  },
];

function ProblemResonance() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="problem-title">
      <div className="landing-container">
        <h2 id="problem-title" className="landing-section-title">¿Te suena alguna de estas?</h2>
        <div className="landing-problem-cards-grid">
          {PROBLEM_CARDS.map((card) => (
            <div key={card.id} className="landing-problem-resonance-card">
              <div className="landing-problem-resonance-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
        <p className="landing-problem-close">
          No es que cuides mal. Es que nadie te dio el sistema para cuidar bien.
        </p>
      </div>
    </section>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    num: '01',
    title: 'Nunca más "creo que era el martes".',
    body: 'Cargás la primera vacuna y la app calcula automáticamente las siguientes según la edad de tu cachorro y el calendario local. Te avisa por mail o notificación tres días antes. No te avisa siete veces, no te avisa tarde.',
  },
  {
    num: '02',
    title: 'Toda la historia de tu perro, en un toque.',
    body: 'Vacunas, medicamentos, síntomas y consultas en un solo lugar. Cuando vas al veterinario, abrís la app, mostrás la pantalla, ahorrás cinco minutos de reconstrucción mental.',
  },
  {
    num: '03',
    title: 'Hecha para vos, no para la clínica.',
    body: 'La interfaz se siente como abrir un álbum, no como llenar una planilla médica. Si es tu primer perro, no asumimos que sabés qué es una "polivalente" — te lo explicamos en cristiano.',
  },
];

function Benefits() {
  return (
    <section className="landing-section" aria-labelledby="benefits-title">
      <div className="landing-container">
        <h2 id="benefits-title" className="landing-section-title">
          Milo Care: la cabeza ordenada de los primeros 12 meses.
        </h2>
        <div className="landing-benefits-grid">
          {BENEFITS.map((b) => (
            <div key={b.num} className="landing-benefit-card">
              <div className="landing-benefit-num" aria-hidden="true">{b.num}</div>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: '1',
    title: 'Creás su perfil.',
    desc: 'Nombre, raza, edad, foto. Como abrir un álbum nuevo.',
  },
  {
    n: '2',
    title: 'Cargás lo que tenés.',
    desc: 'Las vacunas que ya recibió, si está con algún medicamento, la próxima cita si la tenés agendada. Si no tenés nada, cargás solo la edad y Milo Care te arma el resto.',
  },
  {
    n: '3',
    title: 'Empezás a recibir avisos.',
    desc: 'Tres días antes de cada vacuna, dosis o control. Por mail, por notificación, como prefieras.',
  },
  {
    n: '4',
    title: 'Lo llevás a cada consulta.',
    desc: 'Abrís la app en el veterinario, mostrás el historial. O exportás un PDF y se lo mandás antes por WhatsApp.',
  },
];

function HowItWorks() {
  return (
    <section className="landing-section landing-section-alt" id="como-funciona" aria-labelledby="how-title">
      <div className="landing-container">
        <h2 id="how-title" className="landing-section-title">
          Tu cachorro en Milo Care, en 90 segundos.
        </h2>
        <div className="landing-steps">
          {STEPS.map((s, i) => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-number">{s.n}</div>
              {i < STEPS.length - 1 && <div className="landing-step-connector" aria-hidden="true" />}
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

// ── Signup form ───────────────────────────────────────────────────────────────

function SignupForm({ variant, formRef }) {
  const [email, setEmail] = useState('');
  const [dogName, setDogName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
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
      track('signup_submitted', {
        headline_variant: variant,
        has_dog_name: dogName.trim().length > 0,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Algo salió mal. Intentá de nuevo.');
    }
  }

  if (status === 'success') {
    return (
      <p className="landing-signup-success" role="status">
        ¡Listo! Te mandamos un mail para empezar. Si no lo ves en 2 minutos, mirá en spam.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className="landing-signup-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Formulario de registro gratuito"
    >
      <div className="landing-signup-fields">
        <div className="landing-signup-field">
          <label htmlFor="signup-email" className="landing-signup-label">
            Tu email
          </label>
          <input
            id="signup-email"
            type="email"
            className="landing-signup-input"
            placeholder="vos@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="landing-signup-field">
          <label htmlFor="signup-dog-name" className="landing-signup-label">
            Nombre de tu cachorro <span className="landing-signup-optional">(opcional)</span>
          </label>
          <input
            id="signup-dog-name"
            type="text"
            className="landing-signup-input"
            placeholder="Milo, Luna, Thor..."
            value={dogName}
            onChange={(e) => setDogName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      {status === 'error' && (
        <p className="landing-signup-error" role="alert">{errorMsg}</p>
      )}
      <button
        type="submit"
        className="landing-btn-primary landing-btn-lg landing-signup-submit"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? 'Enviando...' : 'Armá el calendario de tu cachorro · es gratis'}
      </button>
      <p className="landing-hero-footnote" style={{ textAlign: 'center' }}>
        90 segundos. Sin tarjeta. En español rioplatense.
      </p>
    </form>
  );
}

// ── Founder story ─────────────────────────────────────────────────────────────

function FounderStory() {
  return (
    <section className="landing-section landing-brand-story-section" aria-labelledby="story-title">
      <div className="landing-container">
        <div className="landing-brand-story-inner">
          <div className="landing-brand-story-paw" aria-hidden="true">🐾</div>
          <h2 id="story-title" className="landing-brand-story-title">¿Por qué se llama Milo Care?</h2>
          <div className="landing-brand-story-text">
            <p>
              Por mi perro. Una tarde lo vi rascarse sin parar. Llegamos al veterinario y la primera pregunta fue:
              ¿cuándo le diste la última pastilla antiparasitaria? No me acordaba. Después: ¿qué vacunas tiene al día?
              Tampoco. El veterinario fue paciente, pero yo me fui de ahí con la sensación de que amar a mi perro no
              alcanzaba si no tenía la información a mano.
            </p>
            <p>
              Milo Care es la app que me hubiera gustado tener esa tarde. La hicimos primero para Milo. Ahora queremos
              que sirva para tu cachorro también.
            </p>
          </div>
          {/* TODO: replace with real founder name and photo */}
          <div className="landing-founder-profile">
            <img
              src="/images/founder-placeholder.jpg"
              alt="Fundador con Milo"
              className="landing-founder-photo"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <p className="landing-brand-story-sig">— [PLACEHOLDER: nombre del fundador], fundador</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Founder Plan ──────────────────────────────────────────────────────────────

function FounderModal({ onClose, variant }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const firstFieldRef = useRef(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
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
    <div
      className="landing-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="landing-modal">
        <button
          className="landing-modal-close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>
        {status === 'success' ? (
          <div className="landing-modal-success" role="status">
            <div style={{ fontSize: '2.5rem' }} aria-hidden="true">🎉</div>
            <h3>¡Reserva recibida!</h3>
            <p>
              Te contactamos en las próximas 24 horas con los detalles del pago. Gracias por ser uno de los primeros.
            </p>
          </div>
        ) : (
          <>
            <h3 id="modal-title" className="landing-modal-title">Reservar mi lugar en el Founder Plan</h3>
            <p className="landing-modal-sub">
              US$25/año vitalicio · sin aumentos · quedan {FOUNDER_SLOTS_AVAILABLE} cupos
            </p>
            <form onSubmit={handleSubmit} noValidate aria-label="Formulario Founder Plan">
              <div className="landing-signup-field" style={{ marginBottom: '12px' }}>
                <label htmlFor="founder-email" className="landing-signup-label">Tu email</label>
                <input
                  id="founder-email"
                  ref={firstFieldRef}
                  type="email"
                  className="landing-signup-input"
                  placeholder="vos@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="landing-signup-field" style={{ marginBottom: '16px' }}>
                <label htmlFor="founder-name" className="landing-signup-label">
                  Tu nombre <span className="landing-signup-optional">(opcional)</span>
                </label>
                <input
                  id="founder-name"
                  type="text"
                  className="landing-signup-input"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              {status === 'error' && (
                <p className="landing-signup-error" role="alert">{errorMsg}</p>
              )}
              <button
                type="submit"
                className="landing-btn-primary landing-btn-full"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Enviando...' : 'Reservar mi lugar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FounderPlan({ variant }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleCtaClick() {
    track('cta_founder_click', { headline_variant: variant });
    setModalOpen(true);
  }

  return (
    <>
      <section className="landing-section landing-founder-section" aria-labelledby="founder-title">
        <div className="landing-container">
          <div className="landing-founder-inner">
            <h2 id="founder-title" className="landing-founder-title">¿Querés ser uno de los primeros 200?</h2>
            <div className="landing-founder-body">
              <p>
                Estamos buscando 200 dueños fundadores que crean en lo que estamos construyendo. No tenemos producto
                perfecto. Tenemos un MVP que funciona y un equipo que va a escuchar cada cosa que digas.
              </p>
              <p>A cambio te ofrecemos:</p>
              <ul className="landing-founder-bullets">
                <li>
                  <strong>Acceso vitalicio a Premium por US$25 al año.</strong> Pagás una vez, queda fijo de por vida,
                  sin aumentos.
                </li>
                <li>
                  <strong>Tu nombre en la pantalla de &quot;Founders&quot; de la app.</strong> Para que tu nieto vea que
                  estuviste desde el día uno.
                </li>
                <li>
                  <strong>Línea directa con el equipo.</strong> Grupo de WhatsApp privado. Lo que pidas, entra al
                  roadmap o te explicamos por qué no.
                </li>
              </ul>
            </div>
            <button
              className="landing-btn-primary landing-btn-lg landing-founder-cta"
              onClick={handleCtaClick}
            >
              Sumate al Founder Plan · US$25/año vitalicio · quedan {FOUNDER_SLOTS_AVAILABLE} cupos
            </button>
            <p className="landing-founder-guarantee">
              Si no te enamorás en 30 días, te devolvemos el dinero sin preguntas.
            </p>
          </div>
        </div>
      </section>
      {modalOpen && (
        <FounderModal variant={variant} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    id: 'gratis',
    q: '¿Es realmente gratis?',
    a: 'Sí. El plan gratuito incluye perfil del perro, recordatorios de vacunas y citas, bitácora de síntomas y medicamentos. Si querés más (copiloto IA, carnet PDF exportable, multi-mascota), está el Premium. No te vamos a pedir tarjeta para registrarte.',
  },
  {
    id: 'datos',
    q: '¿Qué pasa con los datos de mi perro?',
    a: 'Viven cifrados en tu cuenta. Nadie del equipo de Milo Care puede leerlos. Si querés irte, exportás todo en PDF y borrás la cuenta en un click. Sin preguntas.',
  },
  {
    id: 'whatsapp',
    q: 'Ya uso WhatsApp con mi veterinario. ¿Necesito esto?',
    a: 'WhatsApp sirve para hablar. No para acordarse de cosas. La diferencia es que Milo Care te avisa antes de que se te olvide, no cuando ya pasó. Y cuando vas al vet, le compartís el historial entero, no fotos sueltas que tenés que buscar entre 2.000 mensajes.',
  },
  {
    id: 'tres-meses',
    q: 'Mi cachorro tiene 3 meses. ¿Es muy temprano para usarlo?',
    a: 'Es el momento ideal. Justo estás arrancando con el ciclo de vacunas, la desparasitación mensual y la planificación de la castración. Cargás lo que tenés en 2 minutos y la app calcula el resto.',
  },
  {
    id: 'uruguay',
    q: '¿Funciona si vivo en Uruguay?',
    a: 'Sí. Tenemos calendarios vacunales separados para Argentina y Uruguay, hechos con veterinarios locales.',
  },
  {
    id: 'dispositivos',
    q: '¿En qué dispositivos funciona?',
    a: 'Cualquier celular con navegador. iOS y Android. App nativa en camino.',
  },
];

function FAQ({ variant }) {
  const [openId, setOpenId] = useState(null);

  function toggle(id) {
    const isOpening = openId !== id;
    setOpenId(isOpening ? id : null);
    if (isOpening) {
      track('faq_opened', { question_id: id, headline_variant: variant });
    }
  }

  return (
    <section className="landing-section landing-section-alt" aria-labelledby="faq-title">
      <div className="landing-container">
        <h2 id="faq-title" className="landing-section-title">Preguntas que nos hicieron antes que vos.</h2>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="landing-faq-item">
                <button
                  className="landing-faq-question"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  onClick={() => toggle(item.id)}
                >
                  <span>{item.q}</span>
                  <span className="landing-faq-chevron" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                <div
                  id={`faq-answer-${item.id}`}
                  role="region"
                  className={`landing-faq-answer${isOpen ? ' landing-faq-answer--open' : ''}`}
                >
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

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA({ onCtaClick, signupFormRef }) {
  function handleCta(e) {
    e.preventDefault();
    onCtaClick('footer');
    signupFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <section className="landing-cta-section" aria-labelledby="final-cta-title">
      <div className="landing-container landing-cta-inner">
        <h2 id="final-cta-title">Tu cachorro ya creció una semana mientras leías esto.</h2>
        <p>Empezá gratis. Cargás su perfil en 90 segundos. Te avisamos antes de la próxima vacuna.</p>
        <button className="landing-btn-white landing-btn-lg" onClick={handleCta}>
          Armá el calendario de tu cachorro · es gratis
        </button>
        <p style={{ marginTop: '14px', fontSize: '0.875rem', color: '#bfdbfe' }}>
          <a href="mailto:hola@milocare.app" style={{ color: '#fff', fontWeight: 600 }}>
            ¿Sos veterinario? Tenemos un programa para clínicas.
          </a>
        </p>
      </div>
    </section>
  );
}

// ── Signup section (middle of page) ──────────────────────────────────────────

function SignupSection({ variant, formRef }) {
  return (
    <section className="landing-section landing-signup-section" aria-labelledby="signup-section-title">
      <div className="landing-container">
        <h2 id="signup-section-title" className="landing-section-title">
          Empezá gratis. Tu cachorro lo necesita ahora.
        </h2>
        <SignupForm variant={variant} formRef={formRef} />
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
        <p className="landing-footer-copy">
          © 2026 Milocura. Hecho en Buenos Aires y Montevideo.
        </p>
        <div className="landing-footer-links">
          <a href="/terminos.pdf">Términos</a>
          <a href="/privacidad.pdf">Privacidad</a>
          <a href="mailto:hola@milocare.app">Contacto</a>
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
    track('landing_view', {
      headline_variant: variant,
      referrer: document.referrer || 'direct',
    });
  }, [variant]);

  function handleCtaClick(position) {
    track('cta_signup_click', { position, headline_variant: variant });
  }

  return (
    <div className="landing-root">
      <PawCursorTrail />
      <LandingNav variant={variant} />
      <main>
        <Hero variant={variant} onCtaClick={handleCtaClick} signupFormRef={signupFormRef} />
        <ProblemResonance />
        <Benefits />
        <HowItWorks />
        <SignupSection variant={variant} formRef={signupFormRef} />
        <FounderStory />
        <FounderPlan variant={variant} />
        <FAQ variant={variant} />
        <FinalCTA variant={variant} onCtaClick={handleCtaClick} signupFormRef={signupFormRef} />
      </main>
      <LandingFooter />
    </div>
  );
}
