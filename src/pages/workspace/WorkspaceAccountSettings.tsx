import { Link, useLocation } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import WalkthroughSettings from '@/components/video/WalkthroughSettings';
import PaymentsPayoutsSection from '@/components/account/PaymentsPayoutsSection';
import '@/components/workspace/account-settings.css';

export default function WorkspaceAccountSettings() {
  const scheduling = useLocation().pathname.endsWith('/scheduling');
  return <WorkspaceShell><div className="v2-page-stack v2-embedded-section v2-account-settings">
    <header className="v2-page-heading">
      <Link to="/dashboard/account" className="v2-btn-quiet">Back to Account</Link>
      <h1>{scheduling ? 'Walkthrough availability' : 'Payout preferences'}</h1>
      <p>{scheduling ? 'Set your weekly hours, then save your changes.' : 'Choose where Vendibook sends manually reviewed payouts. Provider connections are managed separately in Payment setup.'}</p>
    </header>
    <section className="v2-panel p-4 sm:p-6">{scheduling ? <WalkthroughSettings /> : <PaymentsPayoutsSection />}</section>
  </div></WorkspaceShell>;
}
