import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import PermitsTab from '@/components/dashboard/PermitsTab';
import { ws } from '@/components/workspace/ui/tokens';

export default function WorkspacePermits() {
  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className="min-w-0 rounded-2xl bg-[#101013] p-4 text-white sm:p-6">
          <PermitsTab />
        </div>
      </div>
    </WorkspaceShell>
  );
}
