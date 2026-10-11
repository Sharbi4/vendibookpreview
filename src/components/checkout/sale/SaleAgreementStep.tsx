import ReactMarkdown from 'react-markdown';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { LegalDocumentRow } from '@/lib/legalDocuments';

interface SaleAgreementStepProps {
  document: LegalDocumentRow | null | undefined;
  loading: boolean;
  error: boolean;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  acceptanceText: string;
}

/** Inline legal reader used by the sale wizard; no dialog or sheet. */
const SaleAgreementStep = ({
  document,
  loading,
  error,
  accepted,
  onAcceptedChange,
  acceptanceText,
}: SaleAgreementStepProps) => (
  <div className="sale-agreement">
    {loading ? (
      <div className="sale-agreement-state"><Loader2 className="animate-spin" /> Loading agreement…</div>
    ) : error || !document ? (
      <div className="sale-agreement-state is-error" role="alert">
        <AlertCircle /> The agreement is unavailable. Please retry before continuing.
      </div>
    ) : (
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
        <label className="sale-agreement-check" htmlFor="sale-agreement-accept">
          <Checkbox
            id="sale-agreement-accept"
            checked={accepted}
            onCheckedChange={(value) => onAcceptedChange(value === true)}
          />
          <span>{acceptanceText}</span>
        </label>
      </>
    )}
  </div>
);

export default SaleAgreementStep;