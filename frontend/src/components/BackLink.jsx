import { useNavigate } from 'react-router-dom';

/**
 * Back navigation button shown at the top of every inner page.
 *
 * Props:
 *   to    — explicit destination (default: browser history back, fallback /dashboard)
 *   label — text after the chevron (default: 'Panel')
 */
export default function BackLink({ to, label = 'Panel' }) {
  const navigate = useNavigate();

  function handleClick(e) {
    e.preventDefault();
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  }

  return (
    <a href={to || '#'} onClick={handleClick} className="back-link" aria-label={`Volver a ${label}`}>
      <svg className="back-link-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}
