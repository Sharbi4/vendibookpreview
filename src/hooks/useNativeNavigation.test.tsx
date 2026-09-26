import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ native: true, navigate: vi.fn(), listeners: {} as Record<string, (v: any) => void>, launch: undefined as string | undefined, remove: vi.fn(), session: vi.fn(), exchange: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mock.navigate }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mock.native } }));
vi.mock('@capacitor/app', () => ({ App: {
 addListener: vi.fn(async (name, cb) => { mock.listeners[name] = cb; return { remove: mock.remove }; }),
 getLaunchUrl: vi.fn(async () => mock.launch ? { url: mock.launch } : undefined), minimizeApp: vi.fn(),
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { setSession: mock.session, exchangeCodeForSession: mock.exchange } } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
import { useNativeNavigation } from './useNativeNavigation';
beforeEach(() => { vi.clearAllMocks(); mock.native = true; mock.launch = undefined; mock.listeners = {}; mock.session.mockResolvedValue({error:null}); mock.exchange.mockResolvedValue({error:null}); });
afterEach(cleanup);
it('opens the full payment return on cold launch', async () => {
 mock.launch='https://vendibook.com/payment/return?token=order&state=pending';
 renderHook(useNativeNavigation);
 await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith('/payment/return?token=order&state=pending'));
});
it('establishes recovery session before routing and removes credentials', async () => {
 renderHook(useNativeNavigation);
 mock.listeners.appUrlOpen({url:'https://vendibook.com/reset-password#access_token=a&refresh_token=r&type=recovery'});
 await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith('/reset-password'));
 expect(mock.session).toHaveBeenCalledWith({access_token:'a',refresh_token:'r'});
});
it('rejects foreign hosts and suppresses duplicate deliveries', async () => {
 renderHook(useNativeNavigation);
 mock.listeners.appUrlOpen({url:'https://evil.test/vendibook.com/dashboard'});
 expect(mock.navigate).not.toHaveBeenCalled();
 mock.listeners.appUrlOpen({url:'https://vendibook.com/dashboard'});
 mock.listeners.appUrlOpen({url:'https://vendibook.com/dashboard'});
 await waitFor(() => expect(mock.navigate).toHaveBeenCalledTimes(1));
});
it('does not attach native handlers on the website', () => {
 mock.native=false; renderHook(useNativeNavigation);
 expect(Object.keys(mock.listeners)).toHaveLength(0);
});
it('does not route when session verification fails', async () => {
 mock.session.mockResolvedValue({error: new Error('expired')}); renderHook(useNativeNavigation);
 mock.listeners.appUrlOpen({url:'https://vendibook.com/reset-password#access_token=a&refresh_token=r'});
 await waitFor(() => expect(mock.session).toHaveBeenCalled());
 expect(mock.navigate).not.toHaveBeenCalled();
});
