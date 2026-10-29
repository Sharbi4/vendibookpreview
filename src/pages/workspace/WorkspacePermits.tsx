import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import PermitsTab from '@/components/dashboard/PermitsTab';
import { ws } from '@/components/workspace/ui/tokens';

export default function WorkspacePermits() {
  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <PermitsTab />
      </div>
    </WorkspaceShell>
  );
}
