import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),invoke:vi.fn(),signOut:vi.fn(),path:'/checkout/trailer?step=payment'}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({user:{id:'new-user',user_metadata:{}},isLoading:false,signOut:mocks.signOut})}));
vi.mock('react-router-dom',()=>({useLocation:()=>({pathname:mocks.path})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,functions:{invoke:mocks.invoke}}}));
import Gate from './PhoneVerificationPrompt';
afterEach(cleanup);
beforeEach(()=>{mocks.path='/checkout/trailer?step=payment';mocks.rpc.mockReset();mocks.invoke.mockReset();mocks.rpc.mockResolvedValue({data:{required:true},error:null});});
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
 it('shows an unverified existing host the phone form when starting a new listing',async()=>{
  mocks.path='/list';
  mocks.rpc.mockResolvedValue({data:{required:false,host_phone_required:true},error:null});mount();
  await screen.findByText('A safer marketplace starts with you.');
  expect(screen.queryByText('Private checkout content')).toBeNull();
 });
 it('never walls that host anywhere else',async()=>{
  mocks.path='/dashboard/listings';
  mocks.rpc.mockResolvedValue({data:{required:false,host_phone_required:true},error:null});mount();
  await screen.findByText('Private checkout content');
 });
 it('lets an unverified member browse a listing, with a verify banner instead of a wall',async()=>{
  mocks.path='/listing/c4113bc0-bd6e-41d5-bfd5-7eb135465c36';mount();
  await screen.findByText('Messages and offers are locked.');
  expect(screen.getByText('Private checkout content')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Verify now'}));
  await screen.findByText('A safer marketplace starts with you.');
  expect(screen.queryByText('Private checkout content')).toBeNull();
 });
 it('never blocks browsing while the status check is pending or fails',async()=>{
  mocks.path='/search';
  mocks.rpc.mockResolvedValue({data:null,error:{message:'offline'}});mount();
  await screen.findByText('Private checkout content');
  expect(screen.queryByRole('button',{name:'Try again'})).toBeNull();
 });
 it('still walls messaging for an unverified member',async()=>{
  mocks.path='/messages/abc';mount();
  await screen.findByText('A safer marketplace starts with you.');
  expect(screen.queryByText('Private checkout content')).toBeNull();
 });
});
