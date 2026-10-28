import { afterEach, expect, it, vi } from 'vitest';
import { scheduleAgentHandoff } from '@/lib/atlas/agentHandoff';

afterEach(() => vi.useRealTimers());

it('returns the tool result before closing, then waits for closure before starting the next agent', async () => {
  vi.useFakeTimers();
  const events: string[] = [];
  let finish!: () => void;
  const closed = new Promise<void>((resolve) => { finish = resolve; });
  const tool = async () => {
    scheduleAgentHandoff({ isCurrent: () => true, endSession: async () => { events.push('closing'); await closed; },
      startNext: () => events.push('next'), onError: vi.fn() });
    return 'Starting transfer';
  };
  await tool(); events.push('tool result sent');
  expect(events).toEqual(['tool result sent']);
  vi.advanceTimersByTime(500);
  expect(events).toEqual(['tool result sent', 'closing']);
  finish(); await vi.runAllTimersAsync();
  expect(events).toEqual(['tool result sent', 'closing', 'next']);
});

it('does not start another agent after cancellation during closure', async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const endSession = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const startNext = vi.fn();
  const cancel = scheduleAgentHandoff({ endSession, startNext, onError: vi.fn(), isCurrent: () => true });
  vi.advanceTimersByTime(500); cancel(); finish(); await vi.runAllTimersAsync();
  expect(startNext).not.toHaveBeenCalled();
});

it('ignores a superseded session and reports a closure failure without transferring', async () => {
  vi.useFakeTimers();
  const startNext = vi.fn(); const onError = vi.fn();
  const endSession = vi.fn().mockRejectedValue(new Error('disconnect failed'));
  scheduleAgentHandoff({ endSession, startNext, onError, isCurrent: () => false });
  await vi.runAllTimersAsync(); expect(endSession).not.toHaveBeenCalled();
  scheduleAgentHandoff({ endSession, startNext, onError, isCurrent: () => true });
  await vi.runAllTimersAsync(); expect(onError).toHaveBeenCalledTimes(1); expect(startNext).not.toHaveBeenCalled();
});
