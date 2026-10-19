import { Link } from 'react-router-dom';
import '../styles/landing-v2.css';

// Landing del canal "Barrios privados": convierte el registro obligatorio de
// mascotas del reglamento del barrio en un historial de salud vivo, con un panel
// de cumplimiento antirrábica para la administración. Reusa landing-v2.css.

const BRAND_SVG = (
  <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="12" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="25" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="39" cy="11" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <ellipse cx="52" cy="19" rx="6.5" ry="8.5" fill="currentColor" opacity=".9" />
    <path d="M32 27C20 27 12 34 12 43C12 52 20 57 32 57C44 57 52 52 52 43C52 34 44 27 32 27Z" fill="currentColor" opacity=".9" />
  </svg>
);

// Contacto para administraciones / plataformas de barrios.
const BARRIO_MAIL = 'mailto:hola@milocare.org?subject=Quiero%20Milo%20Care%20en%20mi%20barrio&body=Barrio%2FCountry%3A%0AAdministraci%C3%B3n%2Fplataforma%3A%0ACantidad%20de%20unidades%3A%0AContacto%3A';

const STEPS = [
  { n: '1', t: 'El propietario registra a su perro', d: 'Lo que el reglamento ya pide una vez al año — datos y antirrábica — se carga una sola vez, desde el celular.' },
  { n: '2', t: 'Se vuelve un historial vivo', d: 'Milo Care le suma recordatorios de vacunas, carnet en PDF y seguimiento de salud. Deja de ser un trámite y empieza a servirle todo el año.' },
  { n: '3', t: 'La administración ve el cumplimiento', d: 'Un panel con el semáforo de vacunación antirrábica por unidad. Al día, por vencer o vencido — sin ver un solo dato clínico.' },
  { n: '4', t: 'El barrio se mantiene al día solo', d: 'Cuando una antirrábica está por vencer, el tutor recibe el aviso y renueva. El censo del barrio se actualiza automáticamente.' },
];

const VALUE = [
  { icon: '🐾', t: 'Para el propietario', d: 'De una carga obligatoria a un beneficio real: recordatorios, carnet digital e historial de salud de su perro, gratis. Cargalo una vez, cumplí con el barrio para siempre.' },
  { icon: '🛡️', t: 'Para la administración', d: 'Censo de mascotas y cumplimiento antirrábica siempre actualizados, sin planillas ni reclamos manuales. Menos riesgo, más tranquilidad para todas las familias.' },
  { icon: '🏡', t: 'Para el barrio', d: 'Una comunidad donde todos los perros están vacunados y al día. La salud canina deja de ser un problema de cada casa para ser una fortaleza de todos.' },
];

const TRUST = [
  ['🔒', 'La administración nunca ve la salud de tu perro', 'Solo ve el estado de cumplimiento antirrábica por unidad (al día / por vencer / vencido). Nunca el historial clínico, ni el nombre del tutor o de la mascota. Minimización de datos por diseño (Ley 25.326 AR / 18.331 UY).'],
  ['✅', 'Con tu consentimiento, siempre', 'Vos decidís compartir el estado de cumplimiento con tu barrio. Es tu dato, revocable cuando quieras.'],
  ['🤝', 'Del lado del vecino, no del control', 'Milo Care es tu app de salud, no una herramienta de vigilancia. El barrio cumple su reglamento y vos ganás una herramienta que te sirve todo el año.'],
];

// Maqueta fiel del panel real (BarrioCompliancePanel) para mostrar el producto
// en la landing. Números ilustrativos de un barrio tipo.
const PREVIEW_UNITS = [
  { unit: 'Lote 09', pets: 1, cls: 'over', label: 'Vencido', due: '05 jun' },
  { unit: 'Lote 27', pets: 1, cls: 'over', label: 'Vencido', due: '12 jun' },
  { unit: 'Lote 16', pets: 2, cls: 'none', label: 'Sin registro', due: '—' },
  { unit: 'Lote 45', pets: 2, cls: 'soon', label: 'Por vencer', due: '28 jul' },
  { unit: 'Lote 12', pets: 1, cls: 'ok', label: 'Al día', due: '10 jun 2027' },
];

function BarrioPanelPreview() {
  const R = 34;
  const C = 2 * Math.PI * R;
  const v = 0.9; // 90% con antirrábica vigente
  return (
    <div className="bprev-wrap">
      <div className="bprev-frame">
        <div className="bprev-chrome">
          <div className="bprev-dots"><i /><i /><i /></div>
          <span className="bprev-url">milocare.org/partner</span>
        </div>
        <div className="bprev-body">
          <div className="bprev-head">
            <span className="bprev-logo">L</span>
            <div><h3>Barrio Los Robles</h3><span>Barrio · cumplimiento antirrábica</span></div>
          </div>

          <div className="bprev-hero">
            <svg className="bprev-ring" viewBox="0 0 80 80" width="80" height="80" role="img" aria-label="90% al día">
              <circle cx="40" cy="40" r={R} className="bprev-ring-bg" strokeWidth="8" />
              <circle cx="40" cy="40" r={R} className="bprev-ring-fg" strokeWidth="8"
                strokeDasharray={C} strokeDashoffset={C * (1 - v)} transform="rotate(-90 40 40)" />
              <text x="40" y="45" textAnchor="middle" className="bprev-ring-num">90%</text>
            </svg>
            <div className="bprev-hero-copy">
              <span style={{ opacity: .85, fontSize: '.8rem' }}>Antirrábica vigente</span>
              <b>43 de 48 mascotas al día · 41 unidades</b>
              <span className="bprev-hero-alert">⚠ 5 requieren atención</span>
            </div>
          </div>

          <div className="bprev-kpis">
            <div className="bprev-kpi ok"><b>39</b><span>🟢 Al día</span></div>
            <div className="bprev-kpi soon"><b>4</b><span>🟡 Por vencer</span></div>
            <div className="bprev-kpi over"><b>3</b><span>🔴 Vencido</span></div>
            <div className="bprev-kpi none"><b>2</b><span>⚪ Sin registro</span></div>
          </div>

          <table className="bprev-table">
            <thead><tr><th>Unidad</th><th className="bprev-c">Mascotas</th><th>Estado</th><th>Próx. venc.</th></tr></thead>
            <tbody>
              {PREVIEW_UNITS.map((u) => (
                <tr key={u.unit}>
                  <td style={{ fontWeight: 700 }}>{u.unit}</td>
                  <td className="bprev-c">{u.pets}</td>
                  <td><span className={`bprev-pill ${u.cls}`}>{u.label}</span></td>
                  <td className="bprev-due">{u.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="bprev-caption">
        Vista de la administración: solo el estado de cumplimiento por unidad — nunca el historial clínico ni la identidad del tutor.
      </p>
    </div>
  );
}

function TopBar() {
  return (
    <nav className="landing-nav" aria-label="Navegación">
      <div className="landing-nav-inner">
        <Link to="/" className="landing-brand" style={{ textDecoration: 'none' }}>{BRAND_SVG}<span>Milo Care</span></Link>
        <div className="landing-nav-actions">
          <Link to="/register" className="landing-nav-link">Crear mi cuenta</Link>
          <a href={BARRIO_MAIL} className="landing-btn-primary landing-btn-sm">Sumar mi barrio</a>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-brand" style={{ color: '#e7be6a' }}>{BRAND_SVG}<span>Milo Care</span></div>
        <p className="landing-footer-copy">© 2026 Milocura · La salud de tu perro, al día — y todo el barrio más tranquilo.</p>
        <div className="landing-footer-links">
          <Link to="/">Inicio</Link>
          <Link to="/para-veterinarias">Para veterinarias</Link>
          <Link to="/para-partners">Para empresas</Link>
          <a href="mailto:hola@milocare.org">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

export default function ParaBarriosPage() {
  return (
    <div className="landing-root">
      <TopBar />
      <main>
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-container" style={{ position: 'relative', zIndex: 1 }}>
            <span className="landing-hero-badge">Para barrios privados, countries y consorcios</span>
            <h1 className="landing-hero-title">La salud de los perros del barrio, al día. Todas las familias, más tranquilas.</h1>
            <p className="landing-hero-sub">
              En los barrios privados, cada familia tiene que registrar a su perro y mantener la
              antirrábica al día — es parte del reglamento y de la seguridad de todos. Milo Care
              convierte ese trámite obligatorio en un historial de salud vivo para el tutor, y le
              da a la administración el cumplimiento siempre actualizado. <strong>Todos estamos más
              seguros con Milo Care.</strong>
            </p>
            <div className="landing-hero-ctas">
              <a href={BARRIO_MAIL} className="landing-btn-primary landing-btn-lg">Sumar mi barrio →</a>
              <Link to="/register" className="landing-btn-ghost landing-btn-lg landing-hero-ghost">Registrar a mi perro</Link>
            </div>
            <p className="landing-hero-footnote">
              ¿Administrás un barrio o una plataforma de gestión? Escribinos a{' '}
              <a href={BARRIO_MAIL} style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>hola@milocare.org</a>
            </p>
          </div>
        </section>

        {/* La necesidad */}
        <section className="landing-section landing-section-alt" aria-labelledby="b-need">
          <div className="landing-container">
            <span className="landing-eyebrow">Por qué lo hicimos</span>
            <h2 id="b-need" className="landing-section-title">Una necesidad real de quienes viven en barrios privados.</h2>
            <p className="landing-section-sub">
              Hablando con vecinos y administraciones encontramos el mismo problema una y otra vez:
              el registro de mascotas del reglamento es una foto estática, que se completa una vez
              al año y queda vieja. Nadie sabe con certeza qué perros tienen la antirrábica vigente,
              y asegurar la salud canina —clave para la convivencia y la seguridad de todas las
              familias— termina dependiendo de planillas y de la buena memoria de cada tutor.
              Milo Care nació para resolver eso: que cuidar la salud del perro sea fácil para la
              familia, y que el barrio esté al día sin esfuerzo.
            </p>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="landing-section" id="como-funciona" aria-labelledby="b-steps">
          <div className="landing-container">
            <span className="landing-eyebrow">Cómo funciona</span>
            <h2 id="b-steps" className="landing-section-title">Del registro obligatorio a un barrio siempre al día.</h2>
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

        {/* Producto real: el panel de cumplimiento */}
        <section className="landing-section landing-section-alt" aria-labelledby="b-panel">
          <div className="landing-container">
            <span className="landing-eyebrow">El panel de la administración</span>
            <h2 id="b-panel" className="landing-section-title">Un semáforo de cumplimiento, sin un solo dato clínico.</h2>
            <p className="landing-section-sub">
              Así ve la administración el estado de vacunación del barrio: al día, por vencer o
              vencido, unidad por unidad. Lo accionable primero, actualizado en tiempo real.
            </p>
            <BarrioPanelPreview />
          </div>
        </section>

        {/* Win-win-win */}
        <section className="landing-section" aria-labelledby="b-value">
          <div className="landing-container">
            <span className="landing-eyebrow">Todos ganan</span>
            <h2 id="b-value" className="landing-section-title">Bueno para tu perro, para tu familia y para todo el barrio.</h2>
            <div className="landing-benefits-grid">
              {VALUE.map((c) => (
                <div key={c.t} className="landing-benefit-card">
                  <div className="landing-feature-icon" aria-hidden="true">{c.icon}</div>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Seguridad y privacidad */}
        <section className="landing-section landing-section-alt" aria-labelledby="b-trust">
          <div className="landing-container">
            <span className="landing-eyebrow">Seguridad y privacidad</span>
            <h2 id="b-trust" className="landing-section-title">Más seguros, sin resignar tu privacidad.</h2>
            <div className="landing-why-grid">
              {TRUST.map((g) => (
                <div key={g[1]} className="landing-why-item">
                  <span className="landing-why-icon" aria-hidden="true">{g[0]}</span>
                  <div><h3>{g[1]}</h3><p>{g[2]}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="landing-cta-section" aria-labelledby="b-cta">
          <div className="landing-container landing-cta-inner">
            <h2 id="b-cta">Todos estamos más seguros con Milo Care.</h2>
            <p>Sumá tu barrio o registrá a tu perro hoy. Cuidar la salud canina nunca fue tan fácil — ni tan bueno para toda la comunidad.</p>
            <a href={BARRIO_MAIL} className="landing-btn-white landing-btn-lg">Sumar mi barrio →</a>
            <p style={{ marginTop: '14px', fontSize: '0.95rem', color: '#dbeafe' }}>
              ¿Sos tutor? <Link to="/register" style={{ color: '#fff', fontWeight: 700 }}>Registrá a tu perro gratis →</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
