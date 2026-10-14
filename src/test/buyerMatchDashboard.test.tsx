import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceBuyerMatch from '@/pages/workspace/WorkspaceBuyerMatch';
import type { BuyerMatchData } from '@/lib/monetization/buyerMatchIntelligence';
import type { ListingSignals } from '@/hooks/useBuyerMatchSignals';
const mocks=vi.hoisted(()=>({data:null as BuyerMatchData|null|undefined,action:vi.fn(),error:null as Error|null,signals:{} as Record<string,ListingSignals>}));
vi.mock('@/hooks/useBuyerMatch',()=>({useBuyerMatch:()=>({data:mocks.data,isLoading:false,error:mocks.error,refetch:vi.fn()}),buyerMatchAction:(...args:unknown[])=>mocks.action(...args)}));
vi.mock('@/hooks/useBuyerMatchSignals',()=>({SIGNAL_WINDOW_DAYS:30,useBuyerMatchSignals:()=>({data:mocks.signals,isLoading:false,isError:false,refetch:vi.fn()})}));
vi.mock('@/hooks/useCatalogPrices',()=>({useCatalogPrice:()=>({cents:7900,billingType:'recurring'})}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'seller'}})}));
vi.mock('@/components/workspace/WorkspaceShell',()=>({default:({children}:{children:ReactNode})=><div>{children}</div>}));
function show(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter><WorkspaceBuyerMatch/></MemoryRouter></QueryClientProvider>);}
const pastCampaign={id:'c1',listing_id:'listing',status:'paused',created_at:'2026-10-01T00:00:00Z',listing_snapshot:{id:'listing',title:'Food truck'}};
beforeEach(()=>{cleanup();mocks.action.mockReset();mocks.error=null;mocks.signals={};mocks.data={config:{entitled:true,is_admin:false,submissions_enabled:true,fulfillment_enabled:false,max_campaigns:3},campaigns:[],reports:[],listings:[{id:'listing',title:'Food truck'}],events:[],links:[]};});
describe('BuyerMatch seller experience',()=>{
 it('shows no sample numbers when locked and routes the upgrade to membership management with the catalog price',()=>{
  mocks.data!.config.entitled=false;show();
  expect(screen.queryByText('Example preview')).not.toBeInTheDocument();
  expect(screen.queryByText('1,248')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Get Vendibook Pro · $79/mo'})).toHaveAttribute('href','/dashboard/buyermatch/membership');
  expect(screen.getByRole('link',{name:'Manage membership'})).toHaveAttribute('href','/dashboard/buyermatch/membership');
 });
 it('shows pending service honestly and submits only the selected listing and preferences',async()=>{
  mocks.action.mockResolvedValue({id:'campaign'});show();
  expect(screen.getByText('Searches haven’t started yet.')).toBeInTheDocument();
  expect(screen.queryByText('Research underway')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sale listing'),{target:{value:'listing'}});
  fireEvent.click(screen.getByRole('button',{name:'Send for review'}));
  await waitFor(()=>expect(mocks.action).toHaveBeenCalledWith('submit',{listing_id:'listing',geography:'',buyer_criteria:''}));
 });
 it('keeps historical reporting for expired members without showing an activation form',()=>{
  mocks.data!.config.entitled=false;mocks.data!.campaigns=[pastCampaign];mocks.action.mockResolvedValue({});show();
  expect(screen.queryByRole('button',{name:'Send for review'})).not.toBeInTheDocument();
  expect(screen.getByText(/past reports and buyer messages stay available/)).toBeInTheDocument();
  expect(screen.queryByText(/Admin only/)).not.toBeInTheDocument();
 });
 it('shows an error rather than inventing empty activity after a failed read',()=>{
  mocks.error=new Error('network');mocks.data=undefined;show();
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText(/No searches yet/)).not.toBeInTheDocument();
 });
 it('shows the seller real listing activity and points to the waiting offer first',()=>{
  mocks.signals={listing:{views30:42,saves:3,offersWaiting:1,topOffer:31000,conversations:2}};show();
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByText(/Highest offer waiting:/)).toHaveTextContent('Highest offer waiting: $31,000.');
  expect(screen.getByRole('link',{name:'Answer the offer'})).toHaveAttribute('href','/dashboard/offers');
 });
 it('shows a dash, not zero, when a listing count could not be loaded',()=>{
  mocks.signals={listing:{views30:null,saves:null,offersWaiting:null,topOffer:null,conversations:null}};show();
  expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
 });
});
