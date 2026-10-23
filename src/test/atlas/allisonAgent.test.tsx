import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import AllisonAgent from '@/components/support/AllisonAgent';
import { ALLISON_START_EVENT } from '@/lib/atlas/allisonConfig';

const mocks = vi.hoisted(() => ({ options: {} as any, request: vi.fn(), pause: vi.fn(), invoke: vi.fn(), start: vi.fn(), end: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/edge/invokeFunction', () => ({ invokeEdge: mocks.invoke }));
vi.mock('@/lib/atlas/atlasTools', () => ({ createAtlasTools: (deps: any) => ({ request_follow_up: mocks.request, set_navigation: (p: any) => { mocks.pause(p); deps.onNavigationChange(p.paused); } }) }));
vi.mock('@elevenlabs/react', () => ({ useConversation: (options: any) => { mocks.options = options; return { status: 'disconnected', startSession: mocks.start, endSession: mocks.end }; } }));
beforeEach(() => { vi.clearAllMocks(); mocks.invoke.mockResolvedValue({ data: { signedUrl: 'wss://api.elevenlabs.io/test' } }); });

it('keeps support submission user-confirmed and returns the real reference only after submission', async () => {
  render(<AllisonAgent />);
  await act(async () => { window.dispatchEvent(new CustomEvent(ALLISON_START_EVENT, { detail: { mode: 'text' } })); });
  await act(async () => { await mocks.options.clientTools.request_follow_up({ name: 'Test', email: 'test@example.com', summary: 'An issue' }); });
  expect(mocks.request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(mocks.request).not.toHaveBeenCalled();
  await act(async () => { await mocks.options.clientTools.request_follow_up({ name: 'Test', summary: 'An issue' }); });
  mocks.request.mockResolvedValue(JSON.stringify({ reference: 'REAL-123', follow_up_by: '2026-10-26T14:00:00Z' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('status').textContent).toContain('REAL-123');
});

it('pauses page tools when the visitor asks to stop', async () => {
  render(<AllisonAgent />);
  await act(async () => { window.dispatchEvent(new CustomEvent(ALLISON_START_EVENT, { detail: { mode: 'text' } })); });
  act(() => mocks.options.onMessage({ source: 'user', message: 'Stop changing pages' }));
  expect(mocks.pause).toHaveBeenCalledWith({ paused: true });
});