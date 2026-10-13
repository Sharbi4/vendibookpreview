import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceBuyerMatch from '@/pages/workspace/WorkspaceBuyerMatch';
const mocks=vi.hoisted(()=>({data:null as any,action:vi.fn(),error:null as any}));
vi.mock('@/hooks/useBuyerMatch',()=>({useBuyerMatch:()=>({data:mocks.data,isLoading:false,error:mocks.error,refetch:vi.fn()}),buyerMatchAction:(...args:any[])=>mocks.action(...args)}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'seller'}})}));
vi.mock('@/components/workspace/WorkspaceShell',()=>({default:({children}:any)=><div>{children}</div>}));
function show(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MemoryRouter><WorkspaceBuyerMatch/></MemoryRouter></QueryClientProvider>);}
beforeEach(()=>{cleanup();mocks.action.mockReset();mocks.error=null;mocks.data={config:{entitled:true,is_admin:false,submissions_enabled:true,fulfillment_enabled:false,max_campaigns:3},campaigns:[],reports:[],listings:[{id:'listing',title:'Food truck'}],imports:[]};});
describe('BuyerMatch seller experience',()=>{
 it('labels the locked preview and routes unlocking to dedicated membership management',()=>{
  mocks.data.config.entitled=false;show();
  expect(screen.getByText('Illustrative sample data only — not actual Vendibook or Muse activity.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:/Unlock now/})).toHaveAttribute('href','/dashboard/buyermatch/membership');
  expect(screen.getByRole('link',{name:'Manage membership'})).toHaveAttribute('href','/dashboard/buyermatch/membership');
 });
 it('shows pending service honestly and submits only the selected listing and preferences',async()=>{
  mocks.action.mockResolvedValue({id:'campaign'});show();
  expect(screen.getByText('Pending service activation.')).toBeInTheDocument();
  expect(screen.queryByText('Research underway')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Sale listing'),{target:{value:'listing'}});
  fireEvent.click(screen.getByRole('button',{name:'Submit for activation'}));
  await waitFor(()=>expect(mocks.action).toHaveBeenCalledWith('submit',{listing_id:'listing',geography:'',buyer_criteria:''}));
 });
 it('keeps historical reporting for expired members without showing an activation form',()=>{
  mocks.data.config.entitled=false;show();
  expect(screen.queryByRole('button',{name:'Submit for activation'})).not.toBeInTheDocument();
  expect(screen.getByText(/Historical reports and your messages remain available/)).toBeInTheDocument();
  expect(screen.queryByText(/Admin only/)).not.toBeInTheDocument();
 });
 it('shows an error rather than inventing empty activity after a failed read',()=>{
  mocks.error=new Error('network');mocks.data=undefined;show();
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('No campaigns yet.')).not.toBeInTheDocument();
 });
});
