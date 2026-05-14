export default function RedFlagAlert({ findings = [] }) {
  if (!findings || findings.length === 0) return null;

  return (
    <section className="card" role="alert" aria-live="assertive">
      <h2>Orientación de emergencia</h2>
      <p>
        Se reportaron síntomas graves. Milo Care no puede evaluar emergencias remotamente.
        Consulta a un veterinario antes de finalizar el onboarding.
      </p>
      <ul>
        {findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
    </section>
  );
}
