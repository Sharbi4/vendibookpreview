import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn(),signOut:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'new-user',user_metadata:{}},isLoading:false,signOut:mocks.signOut})}));
vi.mock('react-router-dom',()=>({useLocation:()=>({pathname:'/checkout/trailer?step=payment'})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,functions:{invoke:mocks.invoke}}}));
import Gate from './PhoneVerificationPrompt';
afterEach(cleanup);
beforeEach(()=>{mocks.rpc.mockReset();mocks.invoke.mockReset();mocks.rpc.mockResolvedValue({data:{required:true},error:null});});
const mount=()=>render(<Gate><div>Private checkout content</div></Gate>);
describe('required signup phone gate',()=>{
 it('does not mount checkout for an unverified signup',async()=>{
  mount();await screen.findByText('A safer marketplace starts with you.');
  expect(screen.queryByText('Private checkout content')).toBeNull();
  expect(screen.queryByText('Not now')).toBeNull();
 });
 it('lets an established or verified member continue',async()=>{
  mocks.rpc.mockResolvedValue({data:{required:false},error:null});mount();
  await screen.findByText('Private checkout content');
 });
 it('fails closed and offers retry when status cannot be checked',async()=>{
  mocks.rpc.mockResolvedValue({data:null,error:{message:'offline'}});mount();
  await screen.findByRole('button',{name:'Try again'});
  expect(screen.queryByText('Private checkout content')).toBeNull();
 });
 it('keeps signup blocked when the delivery provider rejects the text',async()=>{
  mocks.invoke.mockResolvedValue({data:{error:'We could not send a text to that number.'},error:null});mount();
  fireEvent.change(await screen.findByLabelText('Mobile number'),{target:{value:'2025550123'}});
  fireEvent.click(screen.getByRole('button',{name:'Text me a code'}));
  await screen.findByText('We could not send a text to that number.');
  expect(screen.queryByLabelText('Verification code')).toBeNull();
  expect(screen.queryByText('Private checkout content')).toBeNull();
 });
 it('rechecks server verification before resuming the original checkout',async()=>{
  let checked=0;
  mocks.rpc.mockImplementation(name=>Promise.resolve({data:name==='signup_phone_status'?{required:++checked===1}:{ok:true},error:null}));
  mocks.invoke.mockResolvedValue({data:{ok:true,retry_after:60},error:null});mount();
  fireEvent.change(await screen.findByLabelText('Mobile number'),{target:{value:'2025550123'}});
  fireEvent.click(screen.getByRole('button',{name:'Text me a code'}));
  fireEvent.change(await screen.findByLabelText('Verification code'),{target:{value:'123456'}});
  fireEvent.click(screen.getByRole('button',{name:'Verify & continue'}));
  await screen.findByText('Private checkout content');
  expect(mocks.rpc).toHaveBeenCalledWith('verify_signup_phone_code',{code:'123456'});
  expect(mocks.invoke).toHaveBeenCalledWith('signup-phone-verification',{body:{phone:'+12025550123',security_sms_consent:true}});
 });
});
