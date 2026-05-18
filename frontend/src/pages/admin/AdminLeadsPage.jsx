import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminLeads } from '../../services/api';

const TIPO_LABELS = {
  signup: { label: 'Beta gratuita', color: '#2563eb', bg: '#eff6ff' },
  founder: { label: 'Founder Plan', color: '#7c3aed', bg: '#faf5ff' },
};

function TipoBadge({ tipo }) {
  const meta = TIPO_LABELS[tipo] || { label: tipo, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '.75rem',
      fontWeight: 700,
      color: meta.color,
      background: meta.bg,
    }}>
      {meta.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tipo, setTipo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (tipo) params.tipo = tipo;
      const { data } = await getAdminLeads(params);
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      setError('No se pudieron cargar los leads.');
    } finally {
      setLoading(false);
    }
  }, [page, tipo]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  function handleTipoChange(e) {
    setTipo(e.target.value);
    setPage(1);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Leads de la landing</h1>
        <Link to="/admin" className="btn-secondary btn-sm">← Panel</Link>
      </header>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={tipo}
          onChange={handleTipoChange}
          className="admin-inline-select"
          aria-label="Filtrar por tipo"
          style={{ padding: '8px 10px', fontSize: '0.875rem' }}
        >
          <option value="">Todos los tipos ({total})</option>
          <option value="signup">Beta gratuita</option>
          <option value="founder">Founder Plan</option>
        </select>

        {!loading && (
          <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            {total} {total === 1 ? 'lead' : 'leads'}
          </span>
        )}
      </div>

      {error && <p className="server-error">{error}</p>}

      {loading ? (
        <p>Cargando leads…</p>
      ) : leads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-muted)' }}>
          <p>Todavía no hay leads{tipo ? ` de tipo ${TIPO_LABELS[tipo]?.label}` : ''}.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Mascota / Nombre</th>
                <th style={thStyle}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={tdStyle}>
                    <a href={`mailto:${lead.email}`} style={{ fontWeight: 600 }}>{lead.email}</a>
                  </td>
                  <td style={tdStyle}><TipoBadge tipo={lead.tipo} /></td>
                  <td style={{ ...tdStyle, color: 'var(--color-muted)' }}>
                    {lead.tipo === 'signup'
                      ? (lead.nombreMascota || <span style={{ fontStyle: 'italic' }}>no indicó</span>)
                      : (lead.nombre || <span style={{ fontStyle: 'italic' }}>no indicó</span>)
                    }
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.875rem', color: 'var(--color-muted)' }}>
            {page} / {pages}
          </span>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 16px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '.8rem',
  color: 'var(--color-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
};

const tdStyle = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};
