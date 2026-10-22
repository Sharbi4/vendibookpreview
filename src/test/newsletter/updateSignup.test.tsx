import React from 'react';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import { UpdateSignupForm } from '@/components/newsletter/UpdateSignupForm';
const {invoke}=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke}}}));
afterEach(()=>{cleanup();vi.clearAllMocks();localStorage.clear();});
function contact(){
 fireEvent.click(screen.getByRole('radio',{name:/Buyer/}));fireEvent.click(screen.getByRole('button',{name:'Make it personal'}));
 fireEvent.change(screen.getByLabelText('Where are you looking?'),{target:{value:'85701'}});fireEvent.click(screen.getByRole('button',{name:'Choose how to stay in touch'}));
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'reader@example.org'}});
}
describe('personalized signup',()=>{
 it('keeps preview submissions local, requires separate consent, and remembers choices on back',async()=>{
  render(<UpdateSignupForm preview/>);contact();
  const emailConsent=screen.getByRole('checkbox',{name:/Email me/});expect(emailConsent).not.toBeChecked();
  fireEvent.click(emailConsent);fireEvent.change(screen.getByLabelText(/Mobile number/),{target:{value:'5205550123'}});
  expect(screen.getByRole('checkbox',{name:/Yes, I agree/})).not.toBeChecked();expect(screen.getByRole('button',{name:'Send my confirmation'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox',{name:/Yes, I agree/}));fireEvent.click(screen.getByRole('button',{name:'Send my confirmation'}));
  expect(await screen.findByText('Looks good.')).toBeInTheDocument();expect(invoke).not.toHaveBeenCalled();
 });
 it('does not show success when the server fails',async()=>{
  invoke.mockResolvedValue({data:null,error:new Error('offline')});render(<UpdateSignupForm/>);contact();fireEvent.click(screen.getByRole('checkbox',{name:/Email me/}));fireEvent.click(screen.getByRole('button',{name:'Send my confirmation'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/couldn’t send/);expect(screen.queryByText('Check your inbox.')).not.toBeInTheDocument();
 });
 it('submits role, region, topics and affirmative email consent',async()=>{
  invoke.mockResolvedValue({data:{ok:true},error:null});render(<UpdateSignupForm/>);contact();fireEvent.click(screen.getByRole('checkbox',{name:/Email me/}));fireEvent.click(screen.getByRole('button',{name:'Send my confirmation'}));
  await waitFor(()=>expect(invoke).toHaveBeenCalledWith('marketplace-updates',{body:expect.objectContaining({role:'buyer',zip:'85701',emailConsent:true,smsConsent:false,phone:null,topics:['listings','regulations','news']})}));
 });
});
