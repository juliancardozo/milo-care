import '../../styles/onboarding-live.css';

const BRACHY = ['bulldog', 'pug', 'boston', 'shih tzu', 'lhasa', 'boxer', 'pekin', 'frances', 'french', 'carlino'];

const SIZE_LABEL = { small: 'Pequeño', medium: 'Mediano', large: 'Grande', giant: 'Gigante' };
const STAGE = {
  puppy: { emoji: '🐶', label: 'Cachorro' },
  adult: { emoji: '🦴', label: 'Adulto' },
  senior: { emoji: '🌟', label: 'Senior' },
};

export function ageInfo(dog) {
  let months = null;
  if (dog.birthDate) {
    const b = new Date(dog.birthDate);
    if (!isNaN(b.getTime())) {
      const now = new Date();
      months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
      if (now.getDate() < b.getDate()) months -= 1;
    }
  } else if (dog.estimatedAgeMonths) {
    months = Number(dog.estimatedAgeMonths);
  }
  if (months == null || isNaN(months) || months < 0) return { months: null, label: null, stage: null };
  const years = Math.floor(months / 12);
  const rem = months % 12;
  let label;
  if (years === 0) label = `${months} ${months === 1 ? 'mes' : 'meses'}`;
  else if (rem === 0) label = `${years} ${years === 1 ? 'año' : 'años'}`;
  else label = `${years} ${years === 1 ? 'año' : 'años'} y ${rem} ${rem === 1 ? 'mes' : 'meses'}`;
  const stage = months < 12 ? 'puppy' : months < 84 ? 'adult' : 'senior';
  return { months, label, stage };
}

function tipFor(dog, stage) {
  const breed = (dog.breed || '').toLowerCase();
  if (BRACHY.some((b) => breed.includes(b))) {
    return '🌡️ Por su hocico corto, cuidá el golpe de calor en verano y los paseos intensos.';
  }
  if (stage === 'puppy') return '💉 Al ser cachorro, vamos a armar su plan de vacunas inicial.';
  if (stage === 'senior') return '🩺 Al ser senior, conviene controles más seguidos. Te avisamos.';
  if (stage === 'adult') return '📅 En la adultez, lo clave es no perderse refuerzos ni el control anual.';
  return null;
}

// Ficha del perro que se arma EN VIVO mientras el tutor completa el onboarding.
export default function LivePetCard({ dog }) {
  const name = (dog.name || '').trim();
  const { label: age, stage } = ageInfo(dog);
  const tip = tipFor(dog, stage);
  const initial = name ? name.charAt(0).toUpperCase() : '🐾';

  const chips = [];
  if (dog.breed) chips.push({ k: 'breed', icon: '🐾', text: dog.breed });
  if (age) chips.push({ k: 'age', icon: '🎂', text: age });
  if (dog.sex === 'male') chips.push({ k: 'sex', icon: '♂️', text: 'Macho' });
  if (dog.sex === 'female') chips.push({ k: 'sex', icon: '♀️', text: 'Hembra' });
  if (dog.size && SIZE_LABEL[dog.size]) chips.push({ k: 'size', icon: '📏', text: SIZE_LABEL[dog.size] });
  if (dog.weightKg) chips.push({ k: 'weight', icon: '⚖️', text: `${dog.weightKg} kg` });

  return (
    <div className="lpc">
      <div className="lpc-row">
        <div className={`lpc-avatar ${dog.photoUrl ? 'has-photo' : ''}`}>
          {dog.photoUrl ? <img src={dog.photoUrl} alt={name || 'Tu perro'} /> : <span>{initial}</span>}
        </div>
        <div className="lpc-info">
          <span className="lpc-eyebrow">Su ficha</span>
          <strong className="lpc-name">{name || 'Tu nuevo compañero'}</strong>
          {stage && (
            <span className="lpc-stage">{STAGE[stage].emoji} {STAGE[stage].label}</span>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="lpc-chips">
          {chips.map((c) => (
            <span key={c.k} className="lpc-chip"><span aria-hidden="true">{c.icon}</span> {c.text}</span>
          ))}
        </div>
      )}

      {tip && <p className="lpc-tip">{tip}</p>}
    </div>
  );
}
