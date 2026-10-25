// @vitest-environment jsdom
import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ManagedInquiryInbox from '../../components/messaging/ManagedInquiryInbox';
const invoke=vi.hoisted(()=>vi.fn());
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'seller'}})}));
afterEach(cleanup);
function show(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter><ManagedInquiryInbox/></MemoryRouter></QueryClientProvider>);}
describe('seller relay inbox',()=>{
 it('leads with the buyer display name and links to the relayed conversation',async()=>{
  invoke.mockResolvedValue({data:{admin:false,threads:[{id:'thread',name:'Sean C.',title:'Food trailer',released:true,email:'private@example.invalid',last_activity_at:'2026-10-25T19:08:32Z'}]}});
  show();expect(await screen.findByText('Sean C.')).toBeTruthy();expect(screen.getByRole('link').getAttribute('href')).toBe('/inquiries/thread');expect(screen.queryByText('private@example.invalid')).toBeNull();
 });
 it('reports load failure rather than an empty inbox',async()=>{invoke.mockResolvedValue({error:{message:'offline'}});show();expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.queryByText('No relayed inquiries yet.')).toBeNull();});
});
