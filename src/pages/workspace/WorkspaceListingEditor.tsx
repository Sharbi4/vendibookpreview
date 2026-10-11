import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { PublishWizard } from '@/components/listing-wizard/PublishWizard';

/**
 * `/dashboard/listings/:listingId/edit` — the existing publish wizard rendered
 * inside the workspace shell. WorkspaceShell already enforces sign-in, and the
 * wizard keeps its own ownership, validation, publish and payment rules.
 */
export default function WorkspaceListingEditor() {
  return (
    <WorkspaceShell>
      <div className="v2-wizard-embed">
        <PublishWizard />
      </div>
    </WorkspaceShell>
  );
}
