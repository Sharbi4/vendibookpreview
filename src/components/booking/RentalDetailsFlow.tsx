import { useEffect, useRef, type ReactNode } from 'react';

export type RentalDetailsSection = 'contact' | 'business' | 'documents' | 'verification' | 'agreement';
export interface RentalDetailsSectionState {
  id: RentalDetailsSection;
  label: string;
  complete: boolean;
}

/** One active details form. Completed sections remain reachable without stacking forms. */
export function RentalDetailsFlow({ sections, active, onChange, children }: {
  sections: RentalDetailsSectionState[];
  active: RentalDetailsSection;
  onChange: (section: RentalDetailsSection) => void;
  children: ReactNode;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const index = sections.findIndex(section => section.id === active);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  }, [active]);
  return (
    <div className="space-y-5">
      <nav aria-label="Rental details sections" className="flex flex-wrap gap-2">
        {sections.map((section, i) => <button
          key={section.id}
          type="button"
          className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-60 ${section.id === active ? 'border-primary bg-primary/10 font-semibold' : 'border-border'}`}
          aria-current={section.id === active ? 'step' : undefined}
          disabled={section.id === active || !sections.slice(0, i).every(previous => previous.complete)}
          onClick={() => onChange(section.id)}
        >{i + 1}. {section.label}{section.complete ? ' ✓' : ''}</button>)}
      </nav>
      <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">
        {sections[index]?.label} <span className="text-sm font-normal text-muted-foreground">({index + 1} of {sections.length})</span>
      </h3>
      <div key={active}>{children}</div>
    </div>
  );
}
