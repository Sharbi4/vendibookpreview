import { Loader2, Mic } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  isRecording: boolean;
  /** Connecting the mic or working out the words — shows a spinner. */
  isBusy?: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

/** The one mic button style used everywhere: green while listening, spinner while working. */
export function VoiceMicButton({ isRecording, isBusy, onClick, disabled, size = 'md', className, label = 'Voice input' }: Props) {
  const reduced = useReducedMotion();
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-pressed={isRecording}
      aria-label={isRecording ? 'Stop listening' : label}
      title={isRecording ? 'Stop listening' : label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-11 w-11',
        isBusy || isRecording
          ? cn('text-success bg-success/10 hover:bg-success/20', !reduced && 'animate-pulse')
          : 'text-muted-foreground/70 hover:text-foreground hover:bg-accent',
        className,
      )}
    >
      {isBusy ? <Loader2 className={cn(icon, 'animate-spin')} aria-hidden="true" /> : <Mic className={icon} aria-hidden="true" />}
    </button>
  );
}
