export function validateOwnerStep(values = {}) {
  const errors = {};
  if (!String(values.name || '').trim()) errors.name = 'El nombre del tutor es obligatorio.';
  if (!String(values.email || '').trim()) errors.email = 'El email es obligatorio.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email))) {
    errors.email = 'Ingresá un email válido.';
  }
  if (!['AR', 'UY'].includes(String(values.country || ''))) {
    errors.country = 'El país debe ser AR o UY.';
  }
  if (!values.disclaimerAccepted) errors.disclaimerAccepted = 'Debés aceptar el aviso legal para continuar.';
  return errors;
}

export function validateDogBasicsStep(values = {}) {
  const errors = {};
  if (!String(values.name || '').trim()) errors.name = 'El nombre del perro es obligatorio.';
  if (!String(values.breed || '').trim()) errors.breed = 'La raza es obligatoria.';
  if (values.birthDate && new Date(values.birthDate) > new Date()) {
    errors.birthDate = 'La fecha de nacimiento no puede ser en el futuro.';
  }
  if (values.weightKg !== '' && values.weightKg !== null && values.weightKg !== undefined) {
    const weight = Number(values.weightKg);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      errors.weightKg = 'El peso debe estar entre 1 y 100 kg.';
    }
  }
  return errors;
}

export function validateClinicalStep(values = {}) {
  const errors = {};
  const symptoms = values.recentSymptoms || {};
  if (symptoms.hasSeizures || symptoms.hasBreathingDifficulty) {
    errors.recentSymptoms = 'Los síntomas graves requieren consulta veterinaria antes de continuar.';
  }
  return errors;
}

export function validateStep(stepKey, values = {}) {
  switch (stepKey) {
    case 'owner':
      return validateOwnerStep(values);
    case 'dog-basic':
      return validateDogBasicsStep(values);
    case 'clinical-history':
      return validateClinicalStep(values);
    default:
      return {};
  }
}
