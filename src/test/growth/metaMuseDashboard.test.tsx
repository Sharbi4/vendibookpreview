import { describe,it,expect,vi,beforeEach } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminMetaMuse from '@/pages/AdminMetaMuse';
const state=vi.hoisted(()=>({admin:true,actions:vi.fn(),leads:[] as any[]}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'fixture-admin'},isLoading:false})}));
vi.mock('@/components/layout/Header',()=>({default:()=>null}));
vi.mock('@/components/SEO',()=>({default:()=>null}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:async(name:string)=>({data:name==='has_role'?state.admin:[],error:null}),from:(name:string)=>({select:()=>({order:()=>({limit:async()=>({data:[],error:null}),then:(r:(v:any)=>void)=>r({data:name==='meta_muse_leads'?state.leads:[],error:null})})})})}}));
vi.mock('@/lib/growth/metaMuse',()=>({leadAction:async(action:string,payload:any)=>{state.actions(action,payload);if(action==='create_lead')state.leads.push({...payload,id:'lead',revision:1});return {};},museRequest:async()=>({muse:'unavailable_missing_secret',sending_enabled:false})}));
function show(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><AdminMetaMuse/></MemoryRouter></QueryClientProvider>);}
beforeEach(()=>{cleanup();state.admin=true;state.leads=[];state.actions.mockReset();});
describe('admin lead authorization and recorded permission',()=>{
 it('does not allow nonadmin lead creation',async()=>{state.admin=false;show();await screen.findByText('Admin access required');expect(screen.queryByRole('button',{name:'Add authorized lead'})).toBeNull();expect(state.actions).not.toHaveBeenCalled();});
 it('saves manually authorized provenance with contact permission initially false',async()=>{show();fireEvent.click(await screen.findByRole('button',{name:'Add authorized lead'}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Authorized test lead'}});fireEvent.change(screen.getByLabelText('Source / authorization evidence'),{target:{value:'Voluntary request reference'}});fireEvent.click(screen.getByRole('button',{name:'Save lead'}));await waitFor(()=>expect(state.actions).toHaveBeenCalledWith('create_lead',expect.objectContaining({name:'Authorized test lead',provenance:'Voluntary request reference',contact_allowed:false,do_not_contact:false,source_kind:'voluntary'})));});
});
