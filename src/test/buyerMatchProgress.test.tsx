import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import BuyerMatchProgress from '@/components/monetization/BuyerMatchProgress';
import type { BuyerMatchProgressUpdate } from '@/lib/monetization/buyerMatchIntelligence';

const update: BuyerMatchProgressUpdate = {
  id: 'report', campaign_id: 'campaign', created_at: '2026-10-30T18:00:00Z', next_update_at: '2026-10-30T18:30:00Z',
  steps: { priority: 'complete', community_access: 'in_progress', review: 'planned' },
};
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('BuyerMatch team progress', () => {
  it('shows recorded timestamps and status without inventing verified results', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T18:10:00Z'));
    const { container } = render(<BuyerMatchProgress update={update}/>);
    expect(screen.getByText('Prepared')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText(/Confirmed outreach, replies and qualified inquiries are counted separately/)).toBeInTheDocument();
    expect([...container.querySelectorAll('time')].map(t => t.dateTime)).toEqual([update.created_at, update.next_update_at]);
    expect(screen.queryByText('Awaiting the next team report')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(21 * 60000));
    expect(screen.getByText('Awaiting the next team report')).toBeInTheDocument();
    expect(container.querySelector('time')?.dateTime).toBe(update.created_at);
  });
  it('renders only fixed public copy, never private metadata or arbitrary step names', () => {
    const privateUpdate = { ...update, evidence_reference: 'Private lead Jane Smith / jane@example.com', steps: { ...update.steps, 'Secret Food Group': 'complete' as const } };
    render(<BuyerMatchProgress update={privateUpdate}/>);
    expect(screen.queryByText(/Jane Smith|jane@example.com|Secret Food Group/)).not.toBeInTheDocument();
  });
});
