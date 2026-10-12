import {describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import PurchaseRequestConfirmation from '@/components/commerce/PurchaseRequestConfirmation';
import {PURCHASE_ACK_VERSION,purchaseAcknowledged,delayedDisbursementDeadline} from '../../supabase/functions/_shared/purchaseRequestPolicy';

describe('purchase acknowledgment and provider deadline',()=>{
  it('requires an explicit current boolean acceptance',()=>{
    expect(purchaseAcknowledged({version:PURCHASE_ACK_VERSION,accepted:true})).toBe(true);
    for(const value of [null,{}, {version:'old',accepted:true},{version:PURCHASE_ACK_VERSION,accepted:'true'}])expect(purchaseAcknowledged(value)).toBe(false);
  });
  it('opening, canceling or closing does not submit',()=>{
    const submit=vi.fn();const change=vi.fn();render(<MemoryRouter><PurchaseRequestConfirmation open onOpenChange={change} onSubmit={submit} busy={false} listingTitle="Truck"/></MemoryRouter>);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Agree & Submit Purchase Request'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Agree & Submit Purchase Request'}));
    expect(submit).toHaveBeenCalledExactlyOnceWith({version:PURCHASE_ACK_VERSION,accepted:true});
    expect(screen.getByRole('link',{name:'purchase terms'})).toHaveAttribute('href','/legal/purchase-agreement');
  });
  it('uses the confirmed capture date and warns three days before automatic release',()=>{
    const captured='2026-10-01T00:00:00Z';
    expect(delayedDisbursementDeadline(captured,Date.parse('2026-10-26T00:00:00Z'))).toMatchObject({deadline:'2026-10-29T00:00:00.000Z',daysRemaining:3,needsReview:true,overdue:false});
    expect(delayedDisbursementDeadline(captured,Date.parse('2026-10-30T00:00:00Z')).overdue).toBe(true);
    expect(()=>delayedDisbursementDeadline('bad')).toThrow();
  });
});
