import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { LegalDocumentRow } from '@/lib/legalDocuments';
import {
  SALE_AGREEMENT_ACCEPTANCE_TEXT,
  RENTAL_AGREEMENT_ACCEPTANCE_TEXT,
  CHECKOUT_PRIVACY_ACCEPTANCE_TEXT,
} from '@/components/checkout/TransactionAgreementStep';

type DocState = { data: LegalDocumentRow | null | undefined; isLoading: boolean; isError: boolean };

interface AgreementCardProps {
  document: DocState;
  fallbackTitle: string;
  summary: string;
  readLabel: string;
  acceptanceText: string;
  accepted: boolean;
  onAcceptedChange: (value: boolean) => void;
  inputId: string;
  onRead: (doc: LegalDocumentRow) => void;
}

const AgreementCard = ({
  document,
  fallbackTitle,
  summary,
  readLabel,
  acceptanceText,
  accepted,
  onAcceptedChange,
  inputId,
  onRead,
}: AgreementCardProps) => {
  if (document.isLoading) {
    return (
      <div className="checkout-agreement-card is-state">
        <Loader2 className="animate-spin" aria-hidden /> Loading {fallbackTitle}…
      </div>
    );
  }
  if (document.isError || !document.data) {
    return (
      <div className="checkout-agreement-card is-state is-error" role="alert">
        <AlertCircle aria-hidden /> {fallbackTitle} is unavailable right now. Please retry before continuing.
      </div>
    );
  }
  const doc = document.data;
  return (
    <div className="checkout-agreement-card">
      <div className="checkout-agreement-head">
        <FileText aria-hidden />
        <div>
          <h3>{doc.title}</h3>
          <p>Version {doc.version}</p>
        </div>
      </div>
      <p className="checkout-agreement-summary">{summary}</p>
      <button type="button" className="checkout-agreement-read" onClick={() => onRead(doc)}>
        {readLabel}
      </button>
      <label className="checkout-agreement-check" htmlFor={inputId}>
        <Checkbox
          id={inputId}
          checked={accepted}
          onCheckedChange={(value) => onAcceptedChange(value === true)}
        />
        <span>{acceptanceText}</span>
      </label>
    </div>
  );
};

interface CheckoutAgreementCardsProps {
  mode: 'sale' | 'rental';
  agreement: DocState;
  privacy: DocState;
  agreementAccepted: boolean;
  privacyAccepted: boolean;
  onAgreementAcceptedChange: (value: boolean) => void;
  onPrivacyAcceptedChange: (value: boolean) => void;
}

/**
 * Compact agreement step. The full versioned documents open in a reader
 * dialog instead of being dumped into the checkout page. Only the two
 * required transaction consents live here — nothing else is bundled in.
 */
const CheckoutAgreementCards = ({
  mode,
  agreement,
  privacy,
  agreementAccepted,
  privacyAccepted,
  onAgreementAcceptedChange,
  onPrivacyAcceptedChange,
}: CheckoutAgreementCardsProps) => {
  const [reading, setReading] = useState<LegalDocumentRow | null>(null);

  return (
    <div className="checkout-agreements">
      <AgreementCard
        document={agreement}
        fallbackTitle={mode === 'sale' ? 'The Purchase Agreement' : 'The Rental Agreement'}
        summary={
          mode === 'sale'
            ? 'Covers what is being sold, the agreed price and fulfillment, and the responsibilities of the buyer and the seller for this purchase. Vendibook is the marketplace, not a party to the sale.'
            : 'Covers the rental period, the agreed rate and fulfillment, and the responsibilities of the renter and the host for this booking. Vendibook is the marketplace, not a party to the rental.'
        }
        readLabel="Read full agreement"
        acceptanceText={mode === 'sale' ? SALE_AGREEMENT_ACCEPTANCE_TEXT : RENTAL_AGREEMENT_ACCEPTANCE_TEXT}
        accepted={agreementAccepted}
        onAcceptedChange={onAgreementAcceptedChange}
        inputId="transaction-agreement-accept"
        onRead={setReading}
      />

      <AgreementCard
        document={privacy}
        fallbackTitle="The Checkout Privacy & Electronic Consent"
        summary="Explains what checkout information Vendibook records for this transaction, and your agreement to receive and sign transaction records electronically."
        readLabel="Read privacy & electronic consent"
        acceptanceText={CHECKOUT_PRIVACY_ACCEPTANCE_TEXT}
        accepted={privacyAccepted}
        onAcceptedChange={onPrivacyAcceptedChange}
        inputId="checkout-privacy-accept"
        onRead={setReading}
      />

      <p className="checkout-agreement-note">
        After checkout, the buyer and seller may be asked to review and sign transaction documents electronically
        through Vendibook.
      </p>

      <Dialog open={Boolean(reading)} onOpenChange={(open) => !open && setReading(null)}>
        <DialogContent className="v2-checkout-dialog checkout-agreement-reader">
          <DialogHeader>
            <DialogTitle>{reading?.title}</DialogTitle>
          </DialogHeader>
          {reading ? (
            <>
              <p className="checkout-agreement-reader-version">Version {reading.version}</p>
              <div className="checkout-agreement-reader-body" tabIndex={0}>
                <ReactMarkdown>{reading.body_markdown}</ReactMarkdown>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckoutAgreementCards;
