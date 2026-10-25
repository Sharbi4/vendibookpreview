import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RelayStatus from '../RelayStatus';

describe('RelayStatus', () => {
  it('shows the sender that their held message is in review', () => {
    render(<RelayStatus message={{ held_for_relay: true }} isOwn />);
    expect(screen.getByText('In review')).toBeTruthy();
  });

  it('tells the sender a declined message was not delivered', () => {
    render(<RelayStatus message={{ held_for_relay: true, relay_declined_at: '2026-10-25T23:00:00Z' }} isOwn />);
    expect(screen.getByText('Not delivered')).toBeTruthy();
  });

  it('labels a relayed copy for both participants', () => {
    const { rerender } = render(<RelayStatus message={{ held_for_relay: false, relayed_from: 'orig' }} isOwn={false} />);
    expect(screen.getByText('Relayed by Vendibook')).toBeTruthy();
    rerender(<RelayStatus message={{ held_for_relay: false, relayed_from: 'orig' }} isOwn />);
    expect(screen.getByText('Relayed by Vendibook')).toBeTruthy();
  });

  it('shows nothing for an ordinary visible message', () => {
    const { container } = render(<RelayStatus message={{ held_for_relay: false }} isOwn={false} />);
    expect(container.textContent).toBe('');
  });
});
