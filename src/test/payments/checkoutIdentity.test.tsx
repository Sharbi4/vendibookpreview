import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { useCheckoutState } from '@/hooks/useCheckoutState';
beforeEach(() => sessionStorage.clear());
it('never carries purchaser details into another signed-in account', () => {
  const { result, rerender } = renderHook(({ account }) => useCheckoutState(`sale:${account}:truck`, { name: '' }), { initialProps: { account: 'buyer-a' } });
  act(() => result.current.setState({ name: 'Alice Buyer' }));
  rerender({ account: 'buyer-b' });
  expect(result.current.state.name).toBe('');
  act(() => result.current.setState({ name: 'Bob Buyer' }));
  rerender({ account: 'buyer-a' });
  expect(result.current.state.name).toBe('Alice Buyer');
});
it('resets progress when the checkout identity changes', () => {
  const { result, rerender } = renderHook(({ account }) => useCheckoutState(account, { name: '' }), { initialProps: { account: 'first' } });
  act(() => result.current.bumpFurthestStep(5));
  rerender({ account: 'second' });
  expect(result.current.furthestStep).toBe(1);
});
