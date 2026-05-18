export default function StepIndicator({ currentStepIndex, totalSteps, labels = [] }) {
  const current = currentStepIndex + 1;

  return (
    <div className="step-indicator" aria-label="Onboarding progress">
      <div className="step-indicator-bar" aria-hidden="true">
        <div
          className="step-indicator-fill"
          style={{ width: `${Math.round((current / totalSteps) * 100)}%` }}
        />
      </div>
      <p className="step-indicator-text">
        Paso {current} de {totalSteps}
        {labels[currentStepIndex] ? ` · ${labels[currentStepIndex]}` : ''}
      </p>
    </div>
  );
}
