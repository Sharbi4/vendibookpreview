import { describe, expect, it } from 'vitest';
import { groupByDay, inboxStamp, notificationTarget } from './inboxFormat';

const now = new Date(2026, 9, 14, 15, 0); // Oct 14 2026, 3:00 PM local

describe('notificationTarget', () => {
  const origin = 'https://vendibook.com';
  it('maps legacy paths onto dashboard routes', () => {
    expect(notificationTarget('/messages/abc', origin)).toEqual({ kind: 'route', to: '/dashboard/messages/abc' });
    expect(notificationTarget('/transactions', origin)).toEqual({ kind: 'route', to: '/dashboard/activity' });
  });
  it('keeps dashboard and other in-app paths with their query', () => {
    expect(notificationTarget('/dashboard/buyermatch?campaign=1', origin)).toEqual({ kind: 'route', to: '/dashboard/buyermatch?campaign=1' });
    expect(notificationTarget('/invoices/42', origin)).toEqual({ kind: 'route', to: '/invoices/42' });
  });
  it('turns same-origin absolute links into routes and opens others externally', () => {
    expect(notificationTarget('https://vendibook.com/messages/x', origin)).toEqual({ kind: 'route', to: '/dashboard/messages/x' });
    expect(notificationTarget('https://example.com/help', origin)).toEqual({ kind: 'external', href: 'https://example.com/help' });
  });
  it('falls back to no navigation for missing or unusable links', () => {
    expect(notificationTarget(null, origin)).toEqual({ kind: 'none' });
    expect(notificationTarget('   ', origin)).toEqual({ kind: 'none' });
    expect(notificationTarget('javascript:alert(1)', origin)).toEqual({ kind: 'none' });
    expect(notificationTarget('//evil.example', origin)).toEqual({ kind: 'none' });
  });
});

describe('groupByDay', () => {
  it('splits into Today and Earlier and drops empty groups', () => {
    const rows = [
      { id: 'a', created_at: new Date(2026, 9, 14, 9).toISOString() },
      { id: 'b', created_at: new Date(2026, 9, 13, 23).toISOString() },
    ];
    expect(groupByDay(rows, now).map(([label, items]) => [label, items.map((r) => r.id)])).toEqual([['Today', ['a']], ['Earlier', ['b']]]);
    expect(groupByDay([rows[1]], now).map(([label]) => label)).toEqual(['Earlier']);
  });
});

describe('inboxStamp', () => {
  it('uses time today, Yesterday, weekday this week, then a date', () => {
    expect(inboxStamp(new Date(2026, 9, 14, 9, 5).toISOString(), now)).toMatch(/9:05/);
    expect(inboxStamp(new Date(2026, 9, 13, 9).toISOString(), now)).toBe('Yesterday');
    expect(inboxStamp(new Date(2026, 9, 10, 9).toISOString(), now)).toBe('Sat');
    expect(inboxStamp(new Date(2026, 8, 1, 9).toISOString(), now)).toBe('Sep 1');
    expect(inboxStamp(null, now)).toBeNull();
  });
});
