import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPolicy, checkCoverage, createClaim, createInsuranceLead } from '../services/companionApi';
import '../styles/companion.css';

const EVENT_OPTIONS = [
  { value: 'accidente', label: 'Accidente' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'cirugia', label: 'Cirugía' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'internacion', label: 'Internación' },
  { value: 'estudios', label: 'Estudios / análisis' },
];

const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-AR') : '—');

export default function MiSeguroPage() {
  const { dogId } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  const [event, setEvent] = useState('accidente');
  const [coverage, setCoverage] = useState(null);
  const [checking, setChecking] = useState(false);

  const [claim, setClaim] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const [leadSent, setLeadSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPolicy(dogId)
      .then(({ data }) => setPolicy(data))
      .catch(() => setPolicy(null))
      .finally(() => setLoading(false));
  }, [dogId]);

  async function runCoverageCheck() {
    setChecking(true);
    setError('');
    try {
      const { data } = await checkCoverage(dogId, event);
      setCoverage(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos verificar la cobertura.');
    } finally {
      setChecking(false);
    }
  }

  async function startClaim(type) {
    setClaiming(true);
    setError('');
    try {
      const { data } = await createClaim(dogId, { type });
      setClaim(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos armar el borrador.');
    } finally {
      setClaiming(false);
    }
  }

  async function requestQuote() {
    setError('');
    try {
      await createInsuranceLead(dogId, {});
      setLeadSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos registrar tu pedido.');
    }
  }

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;

  return (
    <div className="page-container companion-page">
      <Link to={`/dogs/${dogId}`} className="back-link">← Volver al perfil</Link>
      <h1 className="companion-title">Mi seguro</h1>

      {error && <p className="form-error">{error}</p>}

      {/* Resumen de póliza */}
      <section className="card companion-card">
        <h2>Mi póliza</h2>
        {policy ? (
          <>
            <p className="companion-meta">
              {policy.productName || 'Póliza'} · N.º {policy.policyNumber || '—'} · alta {fmt(policy.startDate)}
            </p>
            <ul className="companion-coverage">
              {(policy.coverage || []).map((c, i) => (
                <li key={i}>
                  <span>{c.item}</span>
                  <span className={c.covered ? 'cov-yes' : 'cov-no'}>
                    {c.covered ? `Cubre${c.limit ? ` hasta ${c.limit} ${c.currency || ''}` : ''}` : 'No cubre'}
                    {c.carenciaDays ? ` · carencia ${c.carenciaDays}d` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="companion-meta">Todavía no cargaste una póliza para esta mascota.</p>
        )}
      </section>

      {/* ¿Lo cubre mi póliza? */}
      {policy && (
        <section className="card companion-card">
          <h2>¿Lo cubre mi póliza?</h2>
          <div className="companion-row">
            <select value={event} onChange={(e) => setEvent(e.target.value)} className="companion-select">
              {EVENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn btn-primary" onClick={runCoverageCheck} disabled={checking}>
              {checking ? '…' : 'Verificar'}
            </button>
          </div>
          {coverage && (
            <div className={`companion-result ${coverage.likelyCovered ? 'ok' : 'warn'}`}>
              <p className="companion-result-head">
                {coverage.likelyCovered ? '✓ Probablemente cubierto' : 'ⓘ Revisá con tu aseguradora'}
              </p>
              <p>{coverage.message}</p>
              <p className="companion-disclaimer">{coverage.disclaimer}</p>
            </div>
          )}
        </section>
      )}

      {/* Iniciar un reclamo */}
      {policy && (
        <section className="card companion-card">
          <h2>Iniciar un reclamo</h2>
          <p className="companion-meta">Armamos un borrador con los eventos recientes de su historial.</p>
          <div className="companion-row">
            <button className="btn" onClick={() => startClaim('accident')} disabled={claiming}>Por accidente</button>
            <button className="btn" onClick={() => startClaim('illness')} disabled={claiming}>Por enfermedad</button>
          </div>
          {claim && (
            <div className="companion-result ok">
              <p className="companion-result-head">Borrador creado ({claim.linkedEvents?.length || 0} eventos enlazados)</p>
              <pre className="companion-summary">{claim.generatedSummary}</pre>
              <p className="companion-disclaimer">{claim.disclaimer}</p>
            </div>
          )}
        </section>
      )}

      {/* ¿Necesito un seguro? (lead) */}
      {!policy && (
        <section className="card companion-card">
          <h2>¿Necesito un seguro?</h2>
          <p className="companion-meta">
            Un seguro de mascota ayuda a cubrir gastos por accidentes y enfermedades. Si querés,
            le pasamos tu interés a nuestro partner para que te contacte con una cotización.
          </p>
          {leadSent ? (
            <p className="companion-result ok">¡Listo! Registramos tu interés. Te van a contactar pronto.</p>
          ) : (
            <button className="btn btn-primary" onClick={requestQuote}>Quiero una cotización</button>
          )}
        </section>
      )}
    </div>
  );
}
