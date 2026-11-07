import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import FinancingTopBanner from '@/components/home/FinancingTopBanner';
vi.mock('@/lib/analytics',()=>({trackFinancingApplyClick:vi.fn()}));
afterEach(cleanup);
it('links the supplied desktop and mobile banner artwork to the dedicated APPROVE portal',()=>{
  render(<FinancingTopBanner/>);
  const link=screen.getByRole('link');
  expect(link).toHaveAttribute('href','https://financing.approvepayments.com/vendibook');
  expect(link).toHaveAttribute('rel','noopener noreferrer');
  expect(screen.getByAltText(/Fast, flexible financing with APPROVE/)).toHaveAttribute('src','/images/partners/approve-financing-banner.png');
  expect(screen.getByAltText(/APPROVE financing: fast, flexible financing available/)).toHaveAttribute('src','/images/partners/approve-financing-square-hd.webp');
  expect(screen.queryByRole('heading',{name:'Fast, flexible financing available'})).not.toBeInTheDocument();
});
