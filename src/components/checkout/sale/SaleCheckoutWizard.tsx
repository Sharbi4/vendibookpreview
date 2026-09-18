import type { ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SaleWizardStep {
  id: string;
  label: string;
}

interface SaleCheckoutWizardProps {
  steps: SaleWizardStep[];
  currentStep: number;
  furthestStep: number;
  title: string;
  description?: string;
  children: ReactNode;
  onStepChange: (step: number) => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextBusy?: boolean;
  hideFooter?: boolean;
}

/** A single contained checkout surface. Only its active step changes. */
const SaleCheckoutWizard = ({
  steps,
  currentStep,
  furthestStep,
  title,
  description,
  children,
  onStepChange,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  nextBusy = false,
  hideFooter = false,
}: SaleCheckoutWizardProps) => {
  const active = steps[currentStep - 1];

  return (
    <section className="sale-wizard" aria-labelledby="sale-wizard-title">
      <div className="sale-wizard-mobile-progress">
        <span>Step {currentStep} of {steps.length}</span>
        <strong>{active?.label}</strong>
        <div aria-hidden><i style={{ width: `${(currentStep / steps.length) * 100}%` }} /></div>
      </div>

      <div className="sale-wizard-layout">
        <nav className="sale-wizard-nav" aria-label="Checkout steps">
          <ol>
            {steps.map((step, index) => {
              const number = index + 1;
              const complete = number < currentStep;
              const activeStep = number === currentStep;
              const unlocked = number <= furthestStep;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    disabled={!unlocked || activeStep}
                    onClick={() => onStepChange(number)}
                    className={cn(activeStep && 'is-active', complete && 'is-complete')}
                    aria-current={activeStep ? 'step' : undefined}
                  >
                    <span>{complete ? <Check aria-hidden /> : number}</span>
                    {step.label}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="sale-wizard-stage">
          <header className="sale-wizard-heading">
            <p>{active?.label}</p>
            <h2 id="sale-wizard-title">{title}</h2>
            {description ? <span>{description}</span> : null}
          </header>

          <div key={currentStep} className="sale-wizard-content">
            {children}
          </div>

          {!hideFooter ? (
            <footer className="sale-wizard-footer">
              {onBack ? (
                <Button type="button" variant="outline" onClick={onBack} disabled={nextBusy}>
                  <ChevronLeft aria-hidden /> Back
                </Button>
              ) : <span />}
              {onNext ? (
                <Button type="button" className="checkout-primary-action" onClick={onNext} disabled={nextDisabled || nextBusy}>
                  {nextBusy ? 'Working…' : nextLabel}
                  {!nextBusy ? <ChevronRight aria-hidden /> : null}
                </Button>
              ) : null}
            </footer>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default SaleCheckoutWizard;