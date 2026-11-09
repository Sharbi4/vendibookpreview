import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { feetToInches, inchesToFeet } from '@/lib/listings/dimensions';

interface FeetInputProps {
  id: string;
  /** Stored value in inches, as a string (wizard state). */
  inches: string;
  onInchesChange: (inches: string) => void;
  placeholder?: string;
  /** Above this many feet the seller sees a "did you mean…" hint. */
  maxPlausibleFeet: number;
}

/**
 * Feet entry for a value stored in inches.
 *
 * Keeps what the seller types as local text and only converts on the way
 * out. Re-deriving the visible value from inches on every keystroke ran it
 * through the legacy "small inches = feet" normaliser, so typing "1", "2" or
 * "3" immediately became 12, 24 or 36 and "28" was saved as 248 ft.
 */
export function FeetInput({ id, inches, onInchesChange, placeholder, maxPlausibleFeet }: FeetInputProps) {
  const [text, setText] = useState(() => inchesToFeet(parseFloat(inches) || null));
  const lastEmitted = useRef(inches);

  // Sync only when the value changes from outside (draft load, assistant fill).
  useEffect(() => {
    if (inches !== lastEmitted.current) {
      lastEmitted.current = inches;
      setText(inchesToFeet(parseFloat(inches) || null));
    }
  }, [inches]);

  const feet = parseFloat(text);
  const tooLarge = Number.isFinite(feet) && feet > maxPlausibleFeet;
  const asInches = tooLarge ? Math.round((feet / 12) * 10) / 10 : null;
  const hintId = `${id}-hint`;

  return (
    <>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const out = String(feetToInches(next) ?? '');
          lastEmitted.current = out;
          onInchesChange(out);
        }}
        placeholder={placeholder}
        aria-invalid={tooLarge || undefined}
        aria-describedby={tooLarge ? hintId : undefined}
      />
      {tooLarge && (
        <p id={hintId} className="text-xs text-destructive">
          {asInches && asInches <= maxPlausibleFeet
            ? `That's ${feet} ft. If you measured in inches, enter ${asInches} ft.`
            : `That's ${feet} ft — please double-check this is in feet.`}
        </p>
      )}
    </>
  );
}
