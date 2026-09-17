import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import HostBookings from '@/pages/HostBookings';

export default function WorkspaceBookings() {
  return (
    <WorkspaceShell>
      <HostBookings embedded />
    </WorkspaceShell>
  );
}
