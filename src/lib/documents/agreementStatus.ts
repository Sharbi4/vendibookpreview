/** Derives the renter/host facing state of a SignNow agreement row. */

export type AgreementRowStatus =
  | 'not_created'
  | 'draft'
  | 'sent'
  | 'partially_signed'
  | 'completed'
  | 'voided'
  | 'failed';

export interface AgreementSigner {
  role: 'host' | 'renter' | 'seller' | 'buyer';
  user_id?: string | null;
  signed_at?: string | null;
}

export interface AgreementRow {
  id?: string;
  status?: string | null;
  signers?: AgreementSigner[] | null;
  signed_pdf_path?: string | null;
}

export interface AgreementState {
  status: AgreementRowStatus;
  label: string;
  /** The viewer still has to sign. */
  actionRequired: boolean;
  complete: boolean;
}

export function deriveAgreementState(
  doc: AgreementRow | null | undefined,
  viewerId?: string | null,
): AgreementState {
  if (!doc) {
    return { status: 'not_created', label: 'Agreement not created yet', actionRequired: false, complete: false };
  }

  const status = (doc.status ?? 'draft') as AgreementRowStatus;
  const signers = doc.signers ?? [];
  const mine = viewerId ? signers.find((s) => s.user_id === viewerId) : undefined;
  const others = viewerId ? signers.filter((s) => s.user_id !== viewerId) : signers;

  if (status === 'completed') {
    return { status, label: 'Agreement complete', actionRequired: false, complete: true };
  }
  if (status === 'voided') {
    return { status, label: 'Agreement voided', actionRequired: false, complete: false };
  }
  if (mine && !mine.signed_at) {
    return { status, label: 'Review & sign agreement', actionRequired: true, complete: false };
  }
  if (mine?.signed_at && others.some((s) => !s.signed_at)) {
    const waitingOn = others.find((s) => !s.signed_at);
    const who = waitingOn?.role === 'host' || waitingOn?.role === 'seller' ? 'host' : 'renter';
    return { status, label: `Waiting for ${who} signature`, actionRequired: false, complete: false };
  }
  return { status, label: 'Agreement sent', actionRequired: false, complete: false };
}
