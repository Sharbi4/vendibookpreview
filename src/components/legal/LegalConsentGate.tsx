import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getLegalDocument, type LegalDocumentSlug } from '@/lib/legal/versions';
import {
  recordLegalAcceptance,
  type GrantedPermissions,
  type LegalRelatedEntityType,
} from '@/lib/legal/recordAcceptance';

/**
 * Reusable blocking consent gate.
 *
 * Renders one required checkbox per document, links each document, keeps the
 * action disabled until every box is ticked, and writes the acceptance rows
 * before calling `onAccepted`. The gated action must ALSO verify acceptance
 * server-side — this component is the user-facing half only.
 */
type Props = {
  slugs: LegalDocumentSlug[];
  /** Optional per-slug override of the checkbox sentence. */
  labels?: Partial<Record<LegalDocumentSlug, React.ReactNode>>;
  surface: string;
  relatedEntityType?: LegalRelatedEntityType;
  relatedEntityId?: string | null;
  grantedPermissions?: GrantedPermissions;
  heading?: string;
  intro?: React.ReactNode;
  note?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onAccepted: () => void | Promise<void>;
  onCancel?: () => void;
  /** Extra condition (e.g. a granted browser permission) required to proceed. */
  extraReady?: boolean;
  extraHelper?: string;
  disabled?: boolean;
};

export default function LegalConsentGate({
  slugs,
  labels,
  surface,
  relatedEntityType,
  relatedEntityId,
  grantedPermissions,
  heading = 'Before you continue',
  intro,
  note,
  confirmLabel,
  cancelLabel,
  onAccepted,
  onCancel,
  extraReady = true,
  extraHelper,
  disabled,
}: Props) {
  const { user } = useAuth();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allChecked = slugs.every((s) => checked[s]);
  const canProceed = allChecked && extraReady && !disabled && Boolean(user);

  const proceed = async () => {
    if (!canProceed || !user) return;
    setSaving(true);
    setError('');
    const { error: writeError } = await recordLegalAcceptance({
      userId: user.id,
      slugs,
      surface,
      relatedEntityType,
      relatedEntityId,
      grantedPermissions,
    });
    if (writeError) {
      setSaving(false);
      setError('We could not save your acceptance just now. Please try again.');
      return;
    }
    try {
      await onAccepted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lg-gate">
      <h2 className="lg-gate-title">{heading}</h2>
      {intro && <div className="lg-gate-intro">{intro}</div>}

      <div className="lg-gate-checks">
        {slugs.map((slug) => {
          const doc = getLegalDocument(slug);
          return (
            <label key={slug} className="lg-gate-check">
              <input
                type="checkbox"
                checked={Boolean(checked[slug])}
                onChange={(e) => setChecked((prev) => ({ ...prev, [slug]: e.target.checked }))}
              />
              <span>
                {labels?.[slug] ?? (
                  <>
                    I have read and agree to the{' '}
                    <Link to={doc.route} target="_blank" rel="noreferrer">{doc.title}</Link>.
                  </>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {note && <p className="lg-gate-note">{note}</p>}
      {error && <p className="lg-gate-error">{error}</p>}

      <div className="lg-gate-actions">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {cancelLabel ?? 'Cancel'}
          </Button>
        )}
        <Button onClick={proceed} disabled={!canProceed || saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>

      {!allChecked && <p className="lg-gate-helper">Please review and accept the required terms to continue.</p>}
      {allChecked && !extraReady && extraHelper && <p className="lg-gate-helper">{extraHelper}</p>}

      <p className="lg-gate-version">
        {slugs.map((s) => `${getLegalDocument(s).title} v${getLegalDocument(s).version}`).join(' · ')}
      </p>
    </div>
  );
}
