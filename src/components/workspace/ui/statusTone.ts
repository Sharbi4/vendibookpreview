export type StatusTone = 'neutral' | 'ok' | 'warn' | 'alert' | 'accent' | 'muted';

/** Listing status → pill tone and label. */
export function listingStatusPill(status: string | null | undefined): { tone: StatusTone; label: string } {
  switch (status) {
    case 'published': return { tone: 'ok', label: 'Live' };
    case 'draft': return { tone: 'muted', label: 'Draft' };
    case 'paused': return { tone: 'warn', label: 'Paused' };
    case 'archived': return { tone: 'muted', label: 'Archived' };
    case 'pending_review': return { tone: 'warn', label: 'In review' };
    default: return { tone: 'neutral', label: status ? status.replace(/_/g, ' ') : 'Unknown' };
  }
}
