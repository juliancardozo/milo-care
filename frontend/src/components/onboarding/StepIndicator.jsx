export default function StepIndicator({ currentStepIndex, totalSteps, labels = [] }) {
  const current = currentStepIndex + 1;

  return (
    <div className="onb-stepper" aria-label="Progreso del onboarding">
      <div className="onb-stepper-track" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`onb-seg ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'current' : ''}`}
          />
        ))}
      </div>
      <p className="onb-stepper-text">
        Paso <b>{current}</b> de {totalSteps}
        {labels[currentStepIndex] ? ` · ${labels[currentStepIndex]}` : ''}
      </p>
    </div>
  );
}
