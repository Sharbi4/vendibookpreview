import UpgradesHub from '@/components/dashboard/upgrades/UpgradesHub';

/**
 * Premium Tools and Promote & Upgrades now share one editorial surface.
 * Kept as a thin wrapper so existing `?tab=tools` links keep working.
 */
const PremiumToolsTab = () => <UpgradesHub />;

export default PremiumToolsTab;
