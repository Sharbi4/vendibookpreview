import React from 'react';
import { Asterisk, Eye, FileText, Lock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VisibilityKind = 'public' | 'private' | 'optional' | 'required' | 'paperwork';

const CONFIG: Record<
  VisibilityKind,
  { text: string; icon: React.ComponentType<{ className?: string }>; classes: string }
> = {
  public: {
    text: 'Public — Buyers will see this',
    icon: Eye,
    classes: 'border-border bg-muted/60 text-foreground',
  },
  private: {
    text: 'Private — Only you and authorized VendiBook personnel can access this',
    icon: Lock,
    classes: 'border-border bg-muted/40 text-muted-foreground',
  },
  optional: {
    text: 'Optional — Add this to create a more detailed listing',
    icon: Plus,
    classes: 'border-dashed border-border bg-transparent text-muted-foreground',
  },
  required: {
    text: 'Required — Needed before you can publish',
    icon: Asterisk,
    classes: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  // Not public, but not strictly private either: it is printed on paperwork the
  // buyer receives, such as the financing purchase sheet / pro forma invoice.
  paperwork: {
    text: 'Not shown on your listing — appears on financing paperwork',
    icon: FileText,
    classes: 'border-border bg-muted/40 text-muted-foreground',
  },
};


export interface VisibilityLabelProps {
  kind: VisibilityKind;
  className?: string;
}

/**
 * Visible, reusable privacy/status label. These are always rendered as visible
 * text — never hidden inside a tooltip — because they communicate privacy facts.
 */
export const VisibilityLabel: React.FC<VisibilityLabelProps> = ({ kind, className }) => {
  const { text, icon: Icon, classes } = CONFIG[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        classes,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
};

export default VisibilityLabel;
