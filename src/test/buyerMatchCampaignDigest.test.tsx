import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import BuyerMatchProgress from '@/components/monetization/BuyerMatchProgress';
import type { BuyerMatchMonitoringReport } from '@/lib/monetization/buyerMatchIntelligence';
import fixture from './fixtures/buyerMatchCampaignReport.json';
import aurora from './fixtures/buyerMatchNovember5Aurora.json';
import hollywood from './fixtures/buyerMatchNovember5Hollywood.json';
afterEach(cleanup);
describe('Reviewed campaign digest',()=>{
 it('shows current holds and scheduled reviews without inventing new outreach',()=>{
  const {container}=render(<BuyerMatchProgress update={{id:'nov5',campaign_id:'c',created_at:'2026-11-05T18:00:00Z',next_update_at:null,steps:{review:'planned'},report:aurora as BuyerMatchMonitoringReport}}/>);
  expect(screen.getByText('Prospects identified').nextElementSibling).toHaveTextContent('11');
  expect(screen.getByText('Dated follow-up reviews').nextElementSibling).toHaveTextContent('6');
  expect(screen.getByText('Targeted searches · last 24 hours').nextElementSibling).toHaveTextContent('127');
  expect(screen.getAllByRole('article')).toHaveLength(11);
  expect(screen.getAllByText('Contact paused · scheduled recheck')).toHaveLength(2);
  expect(screen.getByText('Outreach held · capacity review')).toBeInTheDocument();
  expect(screen.getByText(/1 outreach comment reported/)).toHaveTextContent('November 2, 2026');
  expect(container.textContent).not.toMatch(/Chandra|Kristi|Robin|qualified prospects|Direct outreach completed|placements planned beneath/);
  expect(screen.queryByRole('region',{name:'Promotion log'})).not.toBeInTheDocument();
  expect(container.querySelector('time[datetime="2026-11-05T14:16:00Z"]')).toHaveTextContent(/7:16/);
 });
 it('keeps overdue rental follow-ups and location/draft problems explicit',()=>{
  const {container}=render(<BuyerMatchProgress update={{id:'rental',campaign_id:'r',created_at:'2026-11-05T18:00:00Z',next_update_at:null,steps:{review:'planned'},report:hollywood as BuyerMatchMonitoringReport}}/>);
  expect(screen.getAllByRole('article')).toHaveLength(2);
  expect(screen.getAllByText(/Follow-up overdue since/)).toHaveLength(2);
  expect(screen.getByText(/outside the listing’s South Florida market/)).toBeInTheDocument();
  expect(screen.getByText(/Location and specific dates still need confirmation/)).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/Errks|Rick Fox|national matching supported/);
 });
 it('shows nine anonymous prospects, completed outreach and separately labelled pending placements',()=>{
  const {container}=render(<BuyerMatchProgress update={{id:'r',campaign_id:'c',created_at:'2026-11-03T18:00:00Z',next_update_at:null,steps:{review:'planned'},report:fixture as BuyerMatchMonitoringReport}}/>);
  expect(screen.getByText('Prospects identified').nextElementSibling).toHaveTextContent('9');
  expect(screen.getByText('Direct outreach completed').nextElementSibling).toHaveTextContent('1');
  expect(screen.getByText('Targeted searches · last 24 hours').nextElementSibling).toHaveTextContent('134');
  expect(within(screen.getByRole('region',{name:'Promotion log'})).getAllByText('Published')).toHaveLength(5);
  expect(screen.getAllByText('Awaiting admin approval')).toHaveLength(2);
  expect(screen.getByText(/66,700 group members/)).toBeInTheDocument();
  expect(screen.getByText(/Group membership describes the community size/)).toBeInTheDocument();
  expect(within(screen.getByRole('region',{name:'Prospect profiles'})).getAllByRole('article')).toHaveLength(9);
  expect(screen.getAllByText(/Fit score/)).toHaveLength(7);
  expect(screen.getByText('Outreach completed · awaiting reply')).toBeInTheDocument();
  expect(screen.getByText('Westinghouse generator')).toBeInTheDocument();
  expect(screen.getByText(/seller-listed features/)).toBeInTheDocument();
  expect(container.querySelector('time[datetime="2026-11-02T16:06:00Z"]')).toHaveTextContent(/9:06/);
  expect(container.textContent).not.toMatch(/Anna|Robin|Chandra|sending is on hold|Placement status being reconciled|0 completed sales/i);
  expect(container.querySelector('time[datetime="2026-11-03T15:00:00Z"]')).toHaveTextContent(/8:00/);
 });
});
