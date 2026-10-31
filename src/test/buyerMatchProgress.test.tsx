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
  it('separates live placements, pending approvals and unqualified prospects with source dates', () => {
    const report={period_start:'2026-10-30T22:00:00Z',period_end:'2026-10-30T22:30:00Z',placements_as_of:'2026-10-30T21:30:00Z',posts_live:6,posts_pending:5,posts_review:1,marketplace_pending:1,prospects_under_review:1,drafts_pending:3,new_prospects:0,new_replies:0,new_conversions:0,discovery_paused:true,follow_up_held:true,new_draft_prepared:true};
    const {container}=render(<BuyerMatchProgress update={{...update,report}}/>);
    expect(screen.getByText('Group posts reported live').nextElementSibling).toHaveTextContent('6');
    expect(screen.getByText('Awaiting group approval').nextElementSibling).toHaveTextContent('5');
    expect(screen.getByText(/tracked separately from confirmed interest and qualified matches/)).toBeInTheDocument();
    expect(screen.getByText(/New prospect discovery is currently paused/)).toBeInTheDocument();
    expect(screen.getByText(/remain on hold to avoid repeat outreach/)).toBeInTheDocument();
    expect(screen.getByText(/3 additional placement drafts are ready/)).toBeInTheDocument();
    expect(screen.getByText(/This period: 0 new prospects/)).toBeInTheDocument();
    expect(container.querySelector(`time[datetime="${report.placements_as_of}"]`)).toBeInTheDocument();
    expect(screen.queryByText('Local community access')).not.toBeInTheDocument();
  });
  it('presents Day 1 positively without treating pending posts as live or inventing the next update time', () => {
    const report={period_start:'2026-10-30T16:35:00Z',period_end:'2026-10-31T01:37:36Z',placements_as_of:'2026-10-31T01:37:36Z',posts_live:6,posts_pending:5,posts_review:1,marketplace_pending:1,prospects_under_review:1,drafts_pending:4,new_prospects:0,new_replies:0,new_conversions:0,discovery_paused:true,follow_up_held:true,new_draft_prepared:true,report_kind:'day_one' as const,campaign_through:'2026-11-06',discovery_runs_approx:45};
    const {container}=render(<BuyerMatchProgress update={{...update,report,next_update_at:null}}/>);
    expect(screen.getByRole('heading',{name:'Your promotion is underway.'})).toBeInTheDocument();
    expect(screen.getByText(/12 community placements submitted, with 6 already live/)).toBeInTheDocument();
    expect(screen.getByText(/Approximately 45 targeted research rounds/)).toBeInTheDocument();
    expect(screen.getByText('Campaign scheduled through November 6')).toBeInTheDocument();
    expect(screen.getByText(/4 additional placement drafts are ready/)).toBeInTheDocument();
    expect(screen.getByText(/Day 1 results: 0 new prospects · 0 replies · 0 confirmed conversions/)).toBeInTheDocument();
    expect(screen.getByText('After the next campaign review')).toBeInTheDocument();
    expect(screen.queryByText('Awaiting the next team report')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Chandra|Aurora Denver Marketplace|facebook.com/);
  });
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
