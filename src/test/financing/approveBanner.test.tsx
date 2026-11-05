import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FinancingTopBanner from '@/components/home/FinancingTopBanner';
vi.mock('@/lib/analytics',()=>({trackFinancingApplyClick:vi.fn()}));
afterEach(cleanup);
it('links the supplied desktop banner and readable mobile offer to the dedicated APPROVE portal',()=>{
  render(<FinancingTopBanner/>);
  const link=screen.getByRole('link');
  expect(link).toHaveAttribute('href','https://financing.approvepayments.com/vendibook');
  expect(link).toHaveAttribute('rel','noopener noreferrer');
  expect(screen.getByAltText(/Fast, flexible financing with APPROVE/)).toHaveAttribute('src','/images/partners/approve-financing-banner.png');
  expect(screen.getByRole('heading',{name:'Fast, flexible financing available'})).toBeInTheDocument();
});
