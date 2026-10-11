import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import HostReporting from '@/pages/HostReporting';

export default function WorkspaceReporting() {
  return (
    <WorkspaceShell>
      <HostReporting embedded />
    </WorkspaceShell>
  );
}
