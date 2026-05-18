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

const SUBHEAD =
  'Milo Care te ayuda a registrar vacunas, medicamentos, síntomas, citas y recordatorios para que tengas siempre a mano la historia de salud de tu perro.';

const HERO_VARIANTS = {
  a: {
    headline: 'Todo lo importante de tu perro, en un solo lugar.',
    subhead: SUBHEAD,
  },
  b: {
    headline: 'Cuidar a tu perro no debería depender de acordarte de todo.',
    subhead: SUBHEAD,
  },
  c: {
    headline: 'La forma más simple de organizar la salud y el cuidado diario de tu mascota.',
    subhead: SUBHEAD,
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
            Empezar gratis
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
        <h1 className="landing-hero-title">{headline}</h1>
        <p className="landing-hero-sub">{subhead}</p>
        <div className="landing-hero-ctas">
          <Link
            to="/register"
            className="landing-btn-primary landing-btn-lg"
            onClick={() => onCtaClick('hero')}
          >
            Crear el perfil de mi perro →
          </Link>
          <a href="#como-funciona" className="landing-btn-ghost landing-btn-lg landing-hero-ghost">
            Ver cómo funciona
          </a>
        </div>
        <p className="landing-hero-footnote">Sin cita previa. Sin plan obligatorio. Empezás en minutos.</p>
      </div>
    </section>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────────

const PROBLEM_BULLETS = [
  '¿Cuándo fue la última vacuna?',
  '¿Qué medicamento le dimos?',
  '¿Cuándo toca desparasitar?',
  '¿Qué síntoma apareció y cuándo?',
  '¿Qué le tengo que contar al veterinario?',
];

function Problem() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="problem-title">
      <div className="landing-container landing-problem-layout">
        <div className="landing-problem-copy">
          <h2 id="problem-title" className="landing-problem-title">
            Entre vacunas, síntomas, remedios y controles, es fácil olvidarse de algo.
          </h2>
          <p className="landing-problem-body">
            Muchas veces la información de tu perro queda repartida entre mensajes de WhatsApp,
            papeles, fotos del carnet de vacunas, recuerdos sueltos y notas mentales. Milo Care
            nace para ordenar todo eso en un lugar simple, accesible y pensado para el día a día.
          </p>
        </div>
        <div className="landing-problem-bullets-wrap" aria-label="Preguntas frecuentes sin respuesta">
          <ul className="landing-problem-bullets">
            {PROBLEM_BULLETS.map((b) => (
              <li key={b} className="landing-problem-bullet">
                <span className="landing-problem-bullet-icon" aria-hidden="true">?</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Solution ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🐾',
    title: 'Perfil de mascota',
    desc: 'Toda la info de tu perro en un solo lugar: nombre, raza, edad, foto y datos importantes.',
  },
  {
    icon: '💉',
    title: 'Calendario de vacunas',
    desc: 'Registrá las vacunas aplicadas y las que vienen para tener el historial siempre al día.',
  },
  {
    icon: '🐛',
    title: 'Desparasitación',
    desc: 'Programá recordatorios para no olvidarte de las desparasitaciones internas y externas.',
  },
  {
    icon: '💊',
    title: 'Medicamentos',
    desc: 'Llevá el registro de cada medicamento: dosis, frecuencia y duración del tratamiento.',
  },
  {
    icon: '🩺',
    title: 'Síntomas',
    desc: 'Anotá síntomas con fecha para tener contexto claro antes de cada consulta veterinaria.',
  },
  {
    icon: '📅',
    title: 'Citas veterinarias',
    desc: 'Guardá tus citas y recibí recordatorios para que no se te pase ninguna consulta importante.',
  },
  {
    icon: '📝',
    title: 'Notas importantes',
    desc: 'Espacio libre para registrar lo que el veterinario dijo y lo que querés recordar.',
  },
  {
    icon: '📋',
    title: 'Historial de cuidado',
    desc: 'Toda la historia de tu perro organizada y lista para compartir cuando la necesités.',
  },
];

function Solution() {
  return (
    <section className="landing-section" id="como-funciona" aria-labelledby="solution-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Para qué sirve</span>
        <h2 id="solution-title" className="landing-section-title">
          Un perfil simple para acompañar toda la vida de tu mascota.
        </h2>
        <p className="landing-section-sub">
          Creá el perfil de tu perro, cargá sus datos principales y empezá a construir su historial
          de cuidado. Desde el primer día podés registrar eventos importantes, programar recordatorios
          y tener toda la información lista cuando la necesités.
        </p>
        <div className="landing-features-grid landing-features-grid-4">
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

// ── Differential ──────────────────────────────────────────────────────────────

const DIFF_CARDS = [
  {
    num: '01',
    title: 'Empezás en minutos',
    body: 'Registrá a tu perro y cargá lo esencial sin procesos largos ni complicados.',
  },
  {
    num: '02',
    title: 'Todo queda ordenado',
    body: 'Vacunas, medicamentos, síntomas y citas en un historial claro y fácil de consultar.',
  },
  {
    num: '03',
    title: 'Llegás mejor preparado',
    body: 'Cuando tengas una consulta veterinaria, vas a tener información concreta para compartir.',
  },
];

function Differential() {
  return (
    <section className="landing-section landing-section-alt" aria-labelledby="diff-title">
      <div className="landing-container">
        <span className="landing-eyebrow">Por qué Milo Care</span>
        <h2 id="diff-title" className="landing-section-title">
          Autogestivo, liviano y pensado para el cuidado cotidiano.
        </h2>
        <p className="landing-section-sub">
          Milo Care está diseñado para que puedas empezar sin depender de nadie. No necesitás
          agendar una consulta, contratar un plan ni esperar a tener una urgencia. Simplemente
          registrás a tu mascota y empezás a cuidar con más orden y tranquilidad.
        </p>
        <div className="landing-benefits-grid">
          {DIFF_CARDS.map((c) => (
            <div key={c.num} className="landing-benefit-card">
              <div className="landing-benefit-num" aria-hidden="true">{c.num}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── No-vet disclaimer ─────────────────────────────────────────────────────────

function NoVet() {
  return (
    <section className="landing-section landing-novet-section" aria-labelledby="novet-title">
      <div className="landing-container">
        <div className="landing-novet-box">
          <div className="landing-novet-icon" aria-hidden="true">🩺</div>
          <h2 id="novet-title" className="landing-novet-title">
            Una herramienta para cuidar mejor, no para diagnosticar.
          </h2>
          <p className="landing-novet-body">
            Milo Care no reemplaza la mirada profesional de un veterinario. Te ayuda a registrar,
            recordar y ordenar información para que puedas tomar mejores decisiones y consultar a
            tiempo cuando sea necesario.
          </p>
          <p className="landing-novet-micro">
            Ante síntomas importantes, urgencias o dudas médicas, siempre consultá con un
            profesional veterinario.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Use cases ─────────────────────────────────────────────────────────────────

const USE_CASES = [
  'Cuando toca vacunar o desparasitar.',
  'Cuando tu perro empieza con un síntoma.',
  'Cuando le indican un medicamento.',
  'Cuando querés recordar qué dijo el veterinario.',
  'Cuando cambiás de veterinaria.',
  'Cuando viajás o te mudás.',
  'Cuando otra persona también cuida a tu mascota.',
];

function UseCases() {
  return (
    <section className="landing-section" aria-labelledby="usecases-title">
      <div className="landing-container">
        <h2 id="usecases-title" className="landing-section-title">
          Usalo en esos momentos donde normalmente confiás en la memoria.
        </h2>
        <ul className="landing-usecases-grid" aria-label="Casos de uso">
          {USE_CASES.map((u) => (
            <li key={u} className="landing-usecase-item">
              <span className="landing-usecase-check" aria-hidden="true">✓</span>
              <span>{u}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Emotional ─────────────────────────────────────────────────────────────────

function Emotional() {
  return (
    <section className="landing-section landing-emotional-section" aria-labelledby="emotional-title">
      <div className="landing-container">
        <div className="landing-emotional-inner">
          <div className="landing-emotional-paw" aria-hidden="true">🐾</div>
          <h2 id="emotional-title" className="landing-emotional-title">
            Porque tu perro no es una tarea más. Es parte de tu vida.
          </h2>
          <p className="landing-emotional-body">
            El cuidado de una mascota está lleno de pequeños momentos: controles, remedios, comidas,
            paseos, sustos, mejoras y aprendizajes. Milo Care te ayuda a guardar esa historia con
            orden, simpleza y cariño.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Signup form ───────────────────────────────────────────────────────────────

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
        ¡Listo! Te anotamos. Te vamos a escribir cuando podás empezar a usar Milo Care.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className="landing-signup-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Formulario para sumarte a la beta"
    >
      <div className="landing-signup-fields">
        <div className="landing-signup-field">
          <label htmlFor="signup-email" className="landing-signup-label">Tu email</label>
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
            ¿Cómo se llama tu perro? <span className="landing-signup-optional">(opcional)</span>
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
        {status === 'loading' ? 'Enviando...' : 'Quiero probar Milo Care'}
      </button>
      <p className="landing-hero-footnote" style={{ textAlign: 'center' }}>
        Sin cita previa. Sin plan obligatorio. Empezás en minutos.
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
    <div
      className="landing-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
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

// ── Beta / MVP section ────────────────────────────────────────────────────────

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
            <span className="landing-eyebrow landing-eyebrow-light">Beta abierta</span>
            <h2 id="beta-title" className="landing-beta-title">
              Estamos construyendo Milo Care con tutores reales.
            </h2>
            <p className="landing-beta-body">
              Queremos crear una herramienta simple, útil y cercana para personas que aman a sus
              perros y quieren cuidarlos mejor. Sumate a la primera versión y ayudanos a mejorar
              la experiencia.
            </p>
            <SignupForm variant={variant} formRef={formRef} />
            <div className="landing-beta-divider">
              <span>¿Querés ir un paso más?</span>
            </div>
            <div className="landing-beta-founder">
              <p className="landing-beta-founder-text">
                El <strong>Founder Plan</strong> te da acceso vitalicio a Premium por US$25/año —
                un pago único, sin aumentos. Quedan {FOUNDER_SLOTS_AVAILABLE} cupos.
              </p>
              <button
                className="landing-beta-founder-btn"
                onClick={handleFounderClick}
              >
                Conocer el Founder Plan →
              </button>
              <p className="landing-founder-guarantee">
                Si no te enamorás en 30 días, te devolvemos el dinero sin preguntas.
              </p>
            </div>
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
    id: 'reemplaza-vet',
    q: '¿Milo Care reemplaza al veterinario?',
    a: 'No. Milo Care te ayuda a organizar información, recordatorios e historial de cuidado. Para diagnósticos, tratamientos o urgencias, siempre tenés que consultar con un veterinario.',
  },
  {
    id: 'necesito-consulta',
    q: '¿Necesito agendar una consulta para usarlo?',
    a: 'No. Milo Care es autogestivo. Podés registrar a tu mascota y empezar a cargar información en minutos, sin depender de nadie.',
  },
  {
    id: 'ya-tengo-vet',
    q: '¿Puedo usarlo aunque ya tenga veterinario?',
    a: 'Sí. De hecho, Milo Care puede ayudarte a llegar mejor preparado a cada consulta, con datos claros sobre vacunas, síntomas, medicamentos y eventos importantes.',
  },
  {
    id: 'solo-perros',
    q: '¿Sirve solo para perros?',
    a: 'En la primera versión estamos enfocados en perros para crear una experiencia simple y bien cuidada. Más adelante podremos sumar otras mascotas.',
  },
  {
    id: 'no-se-fecha',
    q: '¿Qué pasa si no sé cuándo fue la última vacuna?',
    a: 'Podés cargar la información que tengas y completar el historial de a poco. Milo Care está pensado para ayudarte a ordenar, no para exigirte tener todo perfecto desde el primer día.',
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
        <h2 id="faq-title" className="landing-section-title">Preguntas frecuentes</h2>
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
                  <span className="landing-faq-chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
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

function FinalCTA({ onCtaClick }) {
  return (
    <section className="landing-cta-section" aria-labelledby="final-cta-title">
      <div className="landing-container landing-cta-inner">
        <h2 id="final-cta-title">Cuidar mejor empieza por tener la información ordenada.</h2>
        <p>Menos papeles, menos olvidos, más tranquilidad. Tu perro lo merece.</p>
        <Link
          to="/register"
          className="landing-btn-white landing-btn-lg"
          onClick={() => onCtaClick('footer')}
        >
          Crear el perfil de mi perro →
        </Link>
        <p style={{ marginTop: '14px', fontSize: '0.875rem', color: '#bfdbfe' }}>
          <a href="mailto:hola@milocare.app" style={{ color: '#fff', fontWeight: 600 }}>
            ¿Sos veterinario? Tenemos un programa para clínicas.
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
        <p className="landing-footer-copy">© 2026 Milocura. Hecho en Buenos Aires y Montevideo.</p>
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
        <Hero variant={variant} onCtaClick={handleCtaClick} />
        <Problem />
        <Solution />
        <Differential />
        <NoVet />
        <UseCases />
        <Emotional />
        <BetaSection variant={variant} formRef={signupFormRef} />
        <FAQ variant={variant} />
        <FinalCTA onCtaClick={handleCtaClick} />
      </main>
      <LandingFooter />
    </div>
  );
}
