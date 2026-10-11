import { DisclosureStep } from './DisclosureStep';

type VerificationState = {
  attested: boolean;
  identityStatus: string;
  attestedAt: string | null;
  documentVersion: string | null;
  insuranceAnswer: 'yes' | 'no' | 'unsure' | null;
};

interface RentalVerificationPanelProps {
  listingId: string;
  disabled?: boolean;
  onInsuranceAnswer: (answer: 'yes' | 'no' | 'unsure') => void;
  onValidityChange?: (valid: boolean) => void;
  onComplete: (state: VerificationState) => void;
}

/** Compact insurance, operational attestation, and identity workflow for Details. */
const RentalVerificationPanel = (props: RentalVerificationPanelProps) => (
  <DisclosureStep {...props} compact />
);

export default RentalVerificationPanel;