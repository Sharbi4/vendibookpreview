import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
import { sendMarketplaceMessage } from './messageSafety';

describe('server moderated message submission', () => {
  beforeEach(() => rpc.mockReset());
  it.each(['conversation', 'booking'] as const)('routes %s messages through the server guard', async kind => {
    rpc.mockResolvedValue({ data: { success: true, message: { id: 'message-id' } }, error: null });
    expect(await sendMarketplaceMessage(kind, 'thread-id', 'Is it available?')).toEqual({ id: 'message-id' });
    expect(rpc).toHaveBeenCalledWith('send_marketplace_message', { kind, thread: 'thread-id', body: 'Is it available?', attachment: null });
  });
  it('surfaces the real safety reason instead of treating a rejected RPC as success', async () => {
    rpc.mockResolvedValue({ data: { success: false, error: 'Shortened links are not allowed.' }, error: null });
    await expect(sendMarketplaceMessage('conversation', 'thread', 'link')).rejects.toThrow('Shortened links are not allowed.');
  });
  it('does not report success for a network or authorization error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Not authorized' } });
    await expect(sendMarketplaceMessage('booking', 'thread', 'hello')).rejects.toEqual({ message: 'Not authorized' });
  });
  it('fails closed for a missing server result', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(sendMarketplaceMessage('booking', 'thread', 'hello')).rejects.toThrow('Your message was not sent.');
  });
});