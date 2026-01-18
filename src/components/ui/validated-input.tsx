import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  /** Show success indicator when valid */
  showSuccess?: boolean;
  /** Auto-format as phone number (XXX) XXX-XXXX */
  formatPhone?: boolean;
  /** Helper text shown below input */
  helperText?: string;
  /** Hide the label visually but keep for accessibility */
  hideLabel?: boolean;
}

// Format phone number as user types: (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      value,
      onChange,
      error,
      touched = false,
      required = false,
      showSuccess = true,
      formatPhone = false,
      helperText,
      hideLabel = false,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const isValid = touched && !error && value.trim().length > 0;
    const isInvalid = touched && !!error;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      if (formatPhone) {
        newValue = formatPhoneNumber(newValue);
      }
      onChange(newValue);
    };

    return (
      <div className="space-y-1">
        <Label
          htmlFor={inputId}
          className={cn(
            'text-sm text-muted-foreground mb-1 block',
            hideLabel && 'sr-only'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            value={value}
            onChange={handleChange}
            className={cn(
              'pr-10',
              isInvalid && 'border-destructive focus-visible:ring-destructive',
              showSuccess && isValid && 'border-emerald-500 focus-visible:ring-emerald-500',
              className
            )}
            aria-invalid={isInvalid}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          
          {/* Success indicator */}
          {showSuccess && isValid && (
            <CheckCircle2 
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" 
              aria-hidden="true"
            />
          )}
          
          {/* Error indicator inside input */}
          {isInvalid && !showSuccess && (
            <AlertCircle 
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" 
              aria-hidden="true"
            />
          )}
        </div>

        {/* Error message */}
        {isInvalid && error && (
          <p 
            id={`${inputId}-error`}
            className="text-xs text-destructive mt-1 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Helper text (only show if no error) */}
        {helperText && !isInvalid && (
          <p 
            id={`${inputId}-helper`}
            className="text-xs text-muted-foreground mt-1"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

// Hook for managing form validation state
export interface UseFormValidationOptions<T extends Record<string, string>> {
  initialValues: T;
  validators: Partial<Record<keyof T, (value: string) => string | undefined>>;
}

export interface FormValidationState<T extends Record<string, string>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Set<string>;
  setValue: (field: keyof T, value: string) => void;
  setTouched: (field: keyof T) => void;
  validateField: (field: keyof T) => string | undefined;
  validateAll: () => boolean;
  isValid: boolean;
  reset: () => void;
}

export function useFormValidation<T extends Record<string, string>>({
  initialValues,
  validators,
}: UseFormValidationOptions<T>): FormValidationState<T> {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = React.useState<Set<string>>(new Set());

  const validateField = React.useCallback(
    (field: keyof T): string | undefined => {
      const validator = validators[field];
      if (!validator) return undefined;
      
      const error = validator(values[field]);
      setErrors(prev => ({ ...prev, [field]: error }));
      return error;
    },
    [validators, values]
  );

  const setValue = React.useCallback(
    (field: keyof T, value: string) => {
      setValues(prev => ({ ...prev, [field]: value }));
      
      // Validate on change if already touched
      if (touched.has(field as string)) {
        const validator = validators[field];
        if (validator) {
          const error = validator(value);
          setErrors(prev => ({ ...prev, [field]: error }));
        }
      }
    },
    [touched, validators]
  );

  const setTouched = React.useCallback((field: keyof T) => {
    setTouchedState(prev => new Set(prev).add(field as string));
    validateField(field);
  }, [validateField]);

  const validateAll = React.useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    const allFields = new Set<string>();
    
    for (const field of Object.keys(validators) as Array<keyof T>) {
      allFields.add(field as string);
      const validator = validators[field];
      if (validator) {
        const error = validator(values[field]);
        if (error) newErrors[field] = error;
      }
    }
    
    setErrors(newErrors);
    setTouchedState(allFields);
    
    return Object.keys(newErrors).length === 0;
  }, [validators, values]);

  const isValid = React.useMemo(() => {
    return Object.keys(validators).every(field => {
      const validator = validators[field as keyof T];
      if (!validator) return true;
      return !validator(values[field as keyof T]);
    });
  }, [validators, values]);

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedState(new Set());
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched,
    validateField,
    validateAll,
    isValid,
    reset,
  };
}

// Valid US state and territory codes
const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP' // DC + territories
]);

// Common validators
export const validators = {
  required: (message = 'This field is required') => (value: string) => 
    !value.trim() ? message : undefined,
  
  minLength: (min: number, message?: string) => (value: string) =>
    value.trim().length < min ? (message || `Must be at least ${min} characters`) : undefined,
  
  email: (message = 'Please enter a valid email address') => (value: string) => {
    if (!value.trim()) return undefined; // Let required handle empty
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return !emailRegex.test(value.trim()) ? message : undefined;
  },
  
  phone: (message = 'Please enter a valid phone number (at least 10 digits)') => (value: string) => {
    if (!value.trim()) return undefined; // Let required handle empty
    const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
    return !phoneRegex.test(value.trim()) ? message : undefined;
  },
  
  zipCode: (message = 'Please enter a valid ZIP code') => (value: string) => {
    if (!value.trim()) return undefined;
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return !zipRegex.test(value.trim()) ? message : undefined;
  },
  
  state: (message = 'Please enter a valid 2-letter state code') => (value: string) => {
    if (!value.trim()) return undefined; // Let required handle empty
    return !US_STATE_CODES.has(value.trim().toUpperCase()) ? message : undefined;
  },
  
  // Combine multiple validators
  compose: (...fns: Array<(value: string) => string | undefined>) => (value: string) => {
    for (const fn of fns) {
      const error = fn(value);
      if (error) return error;
    }
    return undefined;
  },
};
