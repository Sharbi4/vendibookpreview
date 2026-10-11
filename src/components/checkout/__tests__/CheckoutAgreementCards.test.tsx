import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CheckoutAgreementCards from '../CheckoutAgreementCards';
import {
  CHECKOUT_PRIVACY_ACCEPTANCE_TEXT,
  RENTAL_AGREEMENT_ACCEPTANCE_TEXT,
} from '../TransactionAgreementStep';

const doc = (id: string, title: string) => ({
  data: { id, title, version: '1.0', body_markdown: 'Body' } as never,
  isLoading: false,
  isError: false,
});

describe('CheckoutAgreementCards combined', () => {
  it('uses one checkbox that accepts both consents with their recorded wording', () => {
    const onAgreement = vi.fn();
    const onPrivacy = vi.fn();
    render(
      <CheckoutAgreementCards
        mode="rental"
        combined
        agreement={doc('a', 'Rental Agreement')}
        privacy={doc('p', 'Checkout Privacy')}
        agreementAccepted={false}
        privacyAccepted={false}
        onAgreementAcceptedChange={onAgreement}
        onPrivacyAcceptedChange={onPrivacy}
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    expect(screen.getByText(`${RENTAL_AGREEMENT_ACCEPTANCE_TEXT} ${CHECKOUT_PRIVACY_ACCEPTANCE_TEXT}`)).toBeTruthy();
    fireEvent.click(boxes[0]);
    expect(onAgreement).toHaveBeenCalledWith(true);
    expect(onPrivacy).toHaveBeenCalledWith(true);
  });

  it('blocks acceptance while a document is unavailable', () => {
    render(
      <CheckoutAgreementCards
        mode="rental"
        combined
        agreement={doc('a', 'Rental Agreement')}
        privacy={{ data: null, isLoading: false, isError: true }}
        agreementAccepted={false}
        privacyAccepted={false}
        onAgreementAcceptedChange={() => {}}
        onPrivacyAcceptedChange={() => {}}
      />,
    );
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
