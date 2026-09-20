import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), sdk: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/lib/paypalClient', () => ({ loadPayPalSdk: mocks.sdk }));
import PayPalCardFields from '@/components/checkout/PayPalCardFields';

let options: any;
let form: any;
let factory: ReturnType<typeof vi.fn>;
let close: ReturnType<typeof vi.fn>;
const target = { kind: 'sale', id: 'sale-id' } as const;
beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({ data: { card_fields_eligible: true, merchant_id: 'SELLER' }, error: null });
  close = vi.fn();
  const field = () => ({ render: vi.fn(async (selector: string) => {
    const frame = document.createElement('iframe');
    document.querySelector(selector)!.appendChild(frame);
  }), close });
  form = { isEligible: () => true, NameField: field, NumberField: field, ExpiryField: field, CVVField: field,
    getState: vi.fn().mockResolvedValue({ isFormValid: true, fields: { cardNameField: { isEmpty: false } } }),
    submit: vi.fn().mockResolvedValue(undefined) };
  factory = vi.fn(value => { options = value; return form; });
  mocks.sdk.mockReset().mockResolvedValue({ CardFields: factory });
});
afterEach(cleanup);
async function setup() {
  const approve = vi.fn();
  const create = vi.fn().mockResolvedValue('CARD_ORDER');
  const view = render(<PayPalCardFields target={target} createOrder={create} onApprove={approve} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to payment review' })).toBeVisible());
  return { approve, create, ...view };
}
function billing() {
  for (const [label, value] of [['Street address', '123 Main St'], ['City', 'Tucson'], ['State / region', 'AZ'], ['ZIP / postal code', '85714']]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Continue to payment review' })); }

describe('real hosted card checkout', () => {
  it('keeps the hosted fields mounted across blur, billing edits and parent renders', async () => {
    const view = await setup();
    const original = [...view.container.querySelectorAll('iframe')];
    expect(original).toHaveLength(4);
    billing();
    fireEvent.blur(screen.getByLabelText('City'));
    view.rerender(<PayPalCardFields target={{ ...target }} createOrder={vi.fn()} onApprove={vi.fn()} />);
    expect([...view.container.querySelectorAll('iframe')]).toEqual(original);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    view.unmount();
    expect(close).toHaveBeenCalledTimes(4);
  });
  it('blocks missing billing information without creating an order', async () => {
    const { create, approve } = await setup(); submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Complete your billing');
    expect(form.submit).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled(); expect(approve).not.toHaveBeenCalled();
  });
  it.each([false, true])('blocks invalid card fields or an empty cardholder name (valid=%s)', async valid => {
    const { approve } = await setup(); billing();
    form.getState.mockResolvedValue({ isFormValid: valid, fields: { cardNameField: { isEmpty: true } } });
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the cardholder name');
    expect(form.submit).not.toHaveBeenCalled(); expect(approve).not.toHaveBeenCalled();
  });
  it('does not interpret submit resolution as payment or approval', async () => {
    const { approve, create } = await setup(); billing(); submit();
    await waitFor(() => expect(form.submit).toHaveBeenCalledWith({ billingAddress: expect.objectContaining({ postalCode: '85714', countryCode: 'US' }) }));
    expect(approve).not.toHaveBeenCalled();
    expect(await options.createOrder()).toBe('CARD_ORDER'); expect(create).toHaveBeenCalledTimes(1);
    act(() => options.onApprove({ orderID: 'CARD_ORDER' }));
    expect(approve).toHaveBeenCalledWith('CARD_ORDER');
    expect(mocks.invoke.mock.calls.every(([name]) => name === 'paypal-checkout-intent')).toBe(true);
  });
  it('keeps entries after SDK rejection and does not invent a bank decline', async () => {
    const { approve, container } = await setup(); billing();
    const frame = container.querySelector('iframe');
    form.submit.mockRejectedValue(new Error('SDK validation error'));
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Card details could not be approved');
    expect(screen.queryByText('Payment declined')).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).toBe(frame);
    expect(screen.getByLabelText('Street address')).toHaveValue('123 Main St');
    expect(approve).not.toHaveBeenCalled();
  });
  it('ignores duplicate submit clicks while SDK approval is outstanding', async () => {
    await setup(); billing();
    let resolve!: () => void;
    form.submit.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    const button = screen.getByRole('button', { name: 'Continue to payment review' });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(form.submit).toHaveBeenCalledTimes(1));
    await act(async () => resolve());
  });
  it('does not render fields when the server says the seller is ineligible', async () => {
    mocks.invoke.mockResolvedValue({ data: { card_fields_eligible: false } });
    render(<PayPalCardFields target={target} createOrder={vi.fn()} onApprove={vi.fn()} />);
    await waitFor(() => expect(screen.queryByLabelText('Loading card fields')).not.toBeInTheDocument());
    expect(mocks.sdk).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('respects SDK eligibility even when the server check passes', async () => {
    form.isEligible = () => false;
    render(<PayPalCardFields target={target} createOrder={vi.fn()} onApprove={vi.fn()} />);
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(mocks.sdk).toHaveBeenCalledWith({ merchantId: 'SELLER', cardFields: true });
  });
});
