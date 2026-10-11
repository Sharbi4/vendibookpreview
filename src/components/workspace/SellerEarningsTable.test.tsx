import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
const retry = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isError: true, refetch: retry }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'seller' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/useSellerPayables', () => ({ useSellerPayables: () => ({ data: [] }) }));
vi.mock('@/components/workspace/SellerRefundDialog', () => ({ default: () => null }));
import SellerEarningsTable from './SellerEarningsTable';
it('renders a retry action instead of zero earnings when payments fail to load', () => {
  render(<SellerEarningsTable />);
  expect(screen.getByRole('alert')).toHaveTextContent('Order payments could not be loaded');
  expect(screen.queryByText('$0.00')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledOnce();
});
