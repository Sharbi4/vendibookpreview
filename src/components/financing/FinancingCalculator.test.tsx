import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FinancingCalculator } from './FinancingCalculator';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/buyerSeoTracking', async importOriginal => ({ ...await importOriginal<object>(), trackBuyerSeoFinancing: track }));
afterEach(() => { cleanup(); track.mockClear(); });
describe('financing calculator interaction', () => {
  it('recalculates, prevents blank values from silently becoming zero, and links the entered budget', () => {
    render(<MemoryRouter initialEntries={['/financing?utm_source=google']}><FinancingCalculator /></MemoryRouter>);
    const price = screen.getByLabelText('Equipment purchase price ($)');
    fireEvent.change(price, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /calculate payment/i })).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Browse equipment within your budget/ })).not.toBeInTheDocument();
    fireEvent.change(price, { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate payment/i }));
    expect(track.mock.calls.filter(call => call[0] === 'calculator_started')).toHaveLength(1);
    expect(track).toHaveBeenCalledWith('calculator_completed', expect.objectContaining({ equipment_price: 50000 }));
    expect(screen.getByRole('link', { name: /Browse equipment within your budget/ })).toHaveAttribute('href', '/search?mode=sale&max_price=50000&utm_source=google');
    expect(screen.getByText(/not a break-even or profit forecast/)).toBeInTheDocument();
  });
});
