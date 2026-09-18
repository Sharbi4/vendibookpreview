import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { LegalDocumentRow } from '@/lib/legalDocuments';

export const SALE_AGREEMENT_ACCEPTANCE_TEXT =
  'I have reviewed and agree to the Vendibook Purchase Agreement and the transaction details shown in this checkout.';
export const RENTAL_AGREEMENT_ACCEPTANCE_TEXT =
  'I have reviewed and agree to the Vendibook Rental Agreement and the booking details shown in this checkout.';
export const CHECKOUT_PRIVACY_ACCEPTANCE_TEXT =
  'I acknowledge the Checkout Privacy & Electronic Consent and agree to receive and sign transaction records electronically.';

interface DocumentPaneProps {
  document: LegalDocumentRow | null | undefined;
  loading: boolean;
  error: boolean;
  fallbackTitle: string;
}

const DocumentPane = ({ document, loading, error, fallbackTitle }: DocumentPaneProps) => {
  if (loading) {
    return (
      <div className="sale-agreement-state">
        <Loader2 className="animate-spin" aria-hidden /> Loading {fallbackTitle}…
      </div>
    );
  }
  if (error || !document) {
    return (
      <div className="sale-agreement-state is-error" role="alert">
        <AlertCircle aria-hidden /> {fallbackTitle} is unavailable right now. Please retry before continuing.
      </div>
    );
  }
  return (
    <>
      <div className="sale-agreement-title">
        <FileText aria-hidden />
        <div>
          <h3>{document.title}</h3>
          <p>Version {document.version}</p>
        </div>
      </div>
      <div className="sale-agreement-document" tabIndex={0} aria-label={`${document.title} document`}>
        <ReactMarkdown>{document.body_markdown}</ReactMarkdown>
      </div>
    </>
  );
};

interface TransactionAgreementStepProps {
  mode: 'sale' | 'rental';
  agreement: { data: LegalDocumentRow | null | undefined; isLoading: boolean; isError: boolean };
  privacy: { data: LegalDocumentRow | null | undefined; isLoading: boolean; isError: boolean };
  agreementAccepted: boolean;
  privacyAccepted: boolean;
  onAgreementAcceptedChange: (value: boolean) => void;
  onPrivacyAcceptedChange: (value: boolean) => void;
  /** Optional heading; the step chrome may already render one. */
  showHeading?: boolean;
}

/**
 * The explicit Agreements step used by both the sale and the rental checkout.
 * Two separate, always-unchecked consents: the transaction agreement and the
 * checkout privacy / electronic records consent. Nothing else is bundled in —
 * no marketing, SMS, GPS, camera, microphone, or recording consent.
 */
const TransactionAgreementStep = ({
  mode,
  agreement,
  privacy,
  agreementAccepted,
  privacyAccepted,
  onAgreementAcceptedChange,
  onPrivacyAcceptedChange,
  showHeading = true,
}: TransactionAgreementStepProps) => (
  <div className="sale-agreement space-y-6">
    {showHeading ? (
      <header>
        <h2 className="text-lg font-semibold text-foreground">Agreements</h2>
        <p className="text-sm text-muted-foreground">
          Review the terms for this transaction before continuing.
        </p>
      </header>
    ) : null}

    <section className="space-y-3">
      <DocumentPane
        document={agreement.data}
        loading={agreement.isLoading}
        error={agreement.isError}
        fallbackTitle={mode === 'sale' ? 'The Purchase Agreement' : 'The Rental Agreement'}
      />
      <label className="sale-agreement-check" htmlFor="transaction-agreement-accept">
        <Checkbox
          id="transaction-agreement-accept"
          checked={agreementAccepted}
          disabled={!agreement.data}
          onCheckedChange={(value) => onAgreementAcceptedChange(value === true)}
        />
        <span>
          {mode === 'sale' ? SALE_AGREEMENT_ACCEPTANCE_TEXT : RENTAL_AGREEMENT_ACCEPTANCE_TEXT}
        </span>
      </label>
    </section>

    <section className="space-y-3">
      <DocumentPane
        document={privacy.data}
        loading={privacy.isLoading}
        error={privacy.isError}
        fallbackTitle="The Checkout Privacy & Electronic Consent"
      />
      <label className="sale-agreement-check" htmlFor="checkout-privacy-accept">
        <Checkbox
          id="checkout-privacy-accept"
          checked={privacyAccepted}
          disabled={!privacy.data}
          onCheckedChange={(value) => onPrivacyAcceptedChange(value === true)}
        />
        <span>{CHECKOUT_PRIVACY_ACCEPTANCE_TEXT}</span>
      </label>
    </section>
  </div>
);

export default TransactionAgreementStep;
