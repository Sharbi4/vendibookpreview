/** Small button styles for row actions. They never touch: parents use gap-2. */
export const btn = {
  /** Outlined pill, readable on white and on #FCFAF7 hover rows. */
  outline:
    'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#E2DBD0] bg-white px-3.5 text-[12.5px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Solid charcoal pill for a decision (Accept). Orange stays reserved for the page's one CTA. */
  solid:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#1C1B1A] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#33302D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Outlined, same height as `solid`. */
  outlineMd:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#E2DBD0] bg-white px-4 text-[13px] font-semibold text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Text-only action (Decline, Cancel offer, Remove). */
  text:
    'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold text-[#5E5953] transition-colors hover:bg-[#F3EEE7] hover:text-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:cursor-not-allowed disabled:opacity-50',
  /** Square icon button (overflow menu). */
  icon:
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E2DBD0] bg-white text-[#1C1B1A] transition-colors hover:border-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A] disabled:opacity-50',
} as const;
