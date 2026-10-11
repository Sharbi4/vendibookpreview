import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import HostAnalytics from '@/pages/HostAnalytics';

export default function WorkspaceAnalytics() {
  return (
    <WorkspaceShell>
      <HostAnalytics embedded />
    </WorkspaceShell>
  );
}
