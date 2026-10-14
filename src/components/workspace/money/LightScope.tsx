import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The site's base shadcn theme is dark, so stock inputs, selects and outline
 * buttons render as black boxes on the dashboard's white panels. Wrapping a
 * legacy form (tax certificates, Square connect, refund dialog trigger) in
 * this scope maps those tokens onto the workspace palette: white fields,
 * charcoal text, warm hairlines. Presentation only.
 */
const LIGHT_TOKENS = {
  '--background': '0 0% 100%',
  '--foreground': '30 4% 11%',
  '--card': '0 0% 100%',
  '--card-foreground': '30 4% 11%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '30 4% 11%',
  '--muted': '36 24% 95%',
  '--muted-foreground': '33 6% 35%',
  '--accent': '36 24% 95%',
  '--accent-foreground': '30 4% 11%',
  '--border': '34 18% 86%',
  '--input': '34 18% 84%',
  '--ring': '30 4% 11%',
} as CSSProperties;

export function LightScope({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div style={LIGHT_TOKENS} className={cn('text-[#1C1B1A]', className)}>
      {children}
    </div>
  );
}
