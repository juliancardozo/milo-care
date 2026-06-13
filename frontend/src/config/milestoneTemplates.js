// Copy centralizado de tarjetas (Fase 3) — ES/EN, voseo. Nada hardcodeado en componentes.
//
// milestoneCard(key/type, lang, { dogName, value }) → { title, subtitle, emoji }
// loveTemplates: tarjetas libres ("mensajes de amor").

const MILESTONES = {
  es: {
    streak_7: { emoji: '🔥', title: '7 días seguidos', subtitle: 'cuidando a {dog} sin fallar' },
    streak_30: { emoji: '🏆', title: '30 días de racha', subtitle: '{dog} tiene un tutor de fierro' },
    streak_100: { emoji: '💯', title: '100 días cuidando a {dog}', subtitle: 'esto es amor de verdad' },
    achievements_5: { emoji: '🎉', title: '5 logros de {dog}', subtitle: 'un campeón en crecimiento' },
    achievements_10: { emoji: '🌟', title: '10 logros de {dog}', subtitle: 'imparable' },
    achievements_25: { emoji: '👑', title: '25 logros de {dog}', subtitle: 'el mejor perro del barrio' },
    first_month: { emoji: '🐾', title: 'Primer mes en Milo Care', subtitle: '{dog} ya es parte de la familia' },
    vaccines_100_days: { emoji: '💉', title: '100 días con vacunas al día', subtitle: '{dog} está protegido' },
    birthday: { emoji: '🎂', title: '¡Feliz cumple, {dog}!', subtitle: '{age} años de pura alegría' },
    _fallback: { emoji: '🐾', title: '¡{dog} logró algo!', subtitle: 'un momento para celebrar' },
  },
  en: {
    streak_7: { emoji: '🔥', title: '7 days in a row', subtitle: 'caring for {dog} without missing' },
    streak_30: { emoji: '🏆', title: '30-day streak', subtitle: '{dog} has a rock-solid human' },
    streak_100: { emoji: '💯', title: '100 days caring for {dog}', subtitle: 'this is real love' },
    achievements_5: { emoji: '🎉', title: "5 of {dog}'s wins", subtitle: 'a growing champion' },
    achievements_10: { emoji: '🌟', title: "10 of {dog}'s wins", subtitle: 'unstoppable' },
    achievements_25: { emoji: '👑', title: "25 of {dog}'s wins", subtitle: 'best dog in the neighborhood' },
    first_month: { emoji: '🐾', title: 'First month on Milo Care', subtitle: '{dog} is family now' },
    vaccines_100_days: { emoji: '💉', title: '100 days vaccines up to date', subtitle: '{dog} is protected' },
    birthday: { emoji: '🎂', title: 'Happy birthday, {dog}!', subtitle: '{age} years of pure joy' },
    _fallback: { emoji: '🐾', title: '{dog} achieved something!', subtitle: 'a moment to celebrate' },
  },
};

export const LOVE_TEMPLATES = {
  es: [
    { id: 'carta', emoji: '💌', title: 'Carta a {dog}', subtitle: 'Gracias por cada día a tu lado. Sos lo mejor que me pasó. 🐾' },
    { id: 'certificado', emoji: '🏅', title: 'Mejor perro del mundo', subtitle: 'Certificado oficial otorgado a {dog} por su tutor.' },
    { id: 'cumple', emoji: '🎂', title: '¡Feliz cumple, {dog}!', subtitle: 'Que tengas mil paseos y muchos huesos. 🦴' },
  ],
  en: [
    { id: 'carta', emoji: '💌', title: 'A letter to {dog}', subtitle: 'Thank you for every day by my side. You are the best. 🐾' },
    { id: 'certificado', emoji: '🏅', title: 'Best dog in the world', subtitle: 'Official certificate awarded to {dog} by their human.' },
    { id: 'cumple', emoji: '🎂', title: 'Happy birthday, {dog}!', subtitle: 'May you have a thousand walks and many bones. 🦴' },
  ],
};

function fill(text, vars) {
  return Object.entries(vars || {}).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), text);
}

// Resuelve el copy de un hito. `m` es el doc Milestone ({ key, type, value }).
export function milestoneCopy(m, lang = 'es', dogName = '') {
  const table = MILESTONES[lang] || MILESTONES.es;
  const base = table[m.key] || table[m.type] || table._fallback;
  const vars = { dog: dogName, age: m.value?.age ?? '' };
  return {
    emoji: base.emoji,
    title: fill(base.title, vars),
    subtitle: fill(base.subtitle, vars),
  };
}

export function loveTemplates(lang = 'es') {
  return LOVE_TEMPLATES[lang] || LOVE_TEMPLATES.es;
}

export function loveCopy(tpl, dogName = '') {
  return { emoji: tpl.emoji, title: fill(tpl.title, { dog: dogName }), subtitle: fill(tpl.subtitle, { dog: dogName }) };
}
