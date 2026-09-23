import { describe, it, expect } from 'vitest';
import { removalCopy } from './UnavailableConversation';
describe('removed conversation notice', () => {
  it('confirms spam and deletion only with the server deletion status', () => {
    expect(removalCopy('spam_sender_deleted').body).toContain("deleted the sender's account");
  });
  it('does not claim account deletion when only the message was removed', () => {
    expect(removalCopy('spam_removed').title).toContain('identified as spam');
    expect(removalCopy('spam_removed').body).not.toContain('deleted');
  });
  it.each([null, undefined, 'permission_denied', 'network_error'])('does not label unavailable conversations as confirmed spam: %s', (status) => {
    expect(removalCopy(status).title).toBe('This conversation is no longer available');
  });
});
